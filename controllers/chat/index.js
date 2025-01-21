import GoogleBigQuery from "#common-functions/big-query/index.js";
import logger from "#common-functions/logger/index.js";
import Bundles from "#schemas/bundles.js";
import Chat from "#schemas/chat.js";
import { v4 as uuidv4 } from "uuid";

const questions = [
  "Who is the gift for?",
  "What is the occasion?",
  "What do they like?",
];
const bigQueryClient = new GoogleBigQuery(process.env.GCP_PROJECT_ID);

export const ChatController = async (req) => {
  try {
    const { response, userEmail } = req.body;
    let { sessionId } = req.body;
    let chatObj;
    if (!sessionId) {
      // generate a new session id.
      sessionId = uuidv4();
      const newChat = new Chat({
        userEmail,
        session: sessionId,
        chat: {
          "Who is the gift for?": null,
          "What is the occasion?": null,
          "What do they like?": null,
        },
      });
      chatObj = await newChat.save();
    } else {
      chatObj = await Chat.findOne({
        session: sessionId,
        userEmail,
        isCompleted: false,
      }).lean();
    }
    if (!chatObj) {
      return {
        status: 400,
        message: "Invalid session id.",
      };
    }
    const chatTemp = {
      responses: chatObj.chat,
      currentQuestion: "",
    };

    // Construct the prompt for Gemini
    const promptTemplate = constructPromptTemplate(response, chatTemp);
    const generatedText = await promptGemini(promptTemplate);
    updateChatStateFromGeminiResponse(generatedText, chatTemp);
    let bundles;
    if (
      Object.values(chatTemp.responses).filter(Boolean).length ===
      questions.length
    ) {
      // construct the semantic search
      const semanticPrompt = generateSemanticQuery(chatTemp);
      const generatedSemanticQuery = await promptGemini(semanticPrompt);
      bundles = await generateSemanticSearchQuery({
        query: generatedSemanticQuery,
        numberOfResults: 10,
      });
      await Chat.findOneAndUpdate(chatObj._id, {
        chat: chatTemp.responses,
        isCompleted: true,
        query: generatedSemanticQuery,
      });
      return {
        status: 200,
        message: "all questions answered",
        data: bundles,
      };
    }
    const nextQuestion = chatTemp.currentQuestion;
    await Chat.findOneAndUpdate(chatObj._id, {
      chat: chatTemp.responses,
    });
    return {
      status: 200,
      message: "Successfully processed the request",
      data: {
        sessionId,
        nextQuestion,
        bundles,
      },
    };
    // }
  } catch (e) {
    console.error("Error handling chat:", e);
    return {
      message: e.message,
      status: 500,
    };
  }
};

const constructPromptTemplate = (userResponse, chatState) => {
  // Extract answered questions
  const answeredQuestions = Object.entries(chatState.responses)
    .filter(([_, value]) => value) // Only include answered questions
    .map(([key, value]) => `${key}: ${value}`)
    .join("\n");

  // Extract unanswered questions
  const unansweredQuestions = Object.keys(chatState.responses)
    .filter((key) => !chatState.responses[key]) // Only include unanswered questions
    .join("\n");

  // Construct the prompt
  return `
You are a chatbot assisting users in selecting gifts. Here is the conversation so far:
${answeredQuestions ? `Answered questions:\n${answeredQuestions}\n` : ""}
User's latest response: ${userResponse}
${unansweredQuestions ? `Unanswered questions:\n${unansweredQuestions}\n` : ""}

Your task is to:
1. Identify which questions from the unanswered questions have been answered by the user's latest response.
2. If all questions are answered, construct a semantic search query based on the collected answers.
3. If some questions remain unanswered, return the next question to ask.

Provide your response in the following JSON structure:
{
  "answeredQuestions": {
    "Who is the gift for?": "Answer from the user, or null if not answered",
    "What is the occasion?": "Answer from the user, or null if not answered",
    "What do they like?": "Answer from the user, or null if not answered"
  },
  "nextQuestion": "Next question to ask, or null if no further questions are needed, act like a human and be polite",
  "semanticSearchQuery": "Constructed semantic search query if all questions are answered, or null if not ready"
}
  `.trim();
};

const generateSemanticQuery = (promptObj) => {
  const { responses } = promptObj;

  // Ensure all required responses are available
  const unansweredQuestions = Object.entries(responses).filter(
    ([_, value]) => !value,
  );

  if (unansweredQuestions.length > 0) {
    throw new Error(
      "Not all required information is available to generate the semantic search query.",
    );
  }

  // Craft the prompt for Gemini
  const prompt = `
You are an AI assistant helping to generate semantic search queries for a gifting platform. Based on the following inputs, create a semantic search query that reflects the user's intent:

Who is the gift for:  ${responses["Who is the gift for?"]}
What is the occasion:  ${responses["What is the occasion?"]}
What do they like:  ${responses["What do they like?"]}

Provide the semantic search query only.
  `;

  return prompt;
};

const updateChatStateFromGeminiResponse = (geminiResponseText, chatState) => {
  try {
    const cleanedResponse = geminiResponseText
      .replace(/```(?:json)?|```/g, "")
      .trim();

    const geminiResponse = JSON.parse(cleanedResponse);

    // Destructure the parsed response
    const { answeredQuestions, nextQuestion, semanticSearchQuery } =
      geminiResponse;

    // Ensure answeredQuestions is an object
    if (answeredQuestions && typeof answeredQuestions === "object") {
      // Update answered questions in chatState
      Object.keys(answeredQuestions).forEach((key) => {
        if (answeredQuestions[key]) {
          chatState.responses[key] = answeredQuestions[key];
        }
      });
    }

    // Update the current question index based on nextQuestion
    if (nextQuestion) {
      chatState.currentQuestion = nextQuestion;
    }

    // If semanticSearchQuery is available, store it
    if (semanticSearchQuery) {
      chatState.semanticQuery = semanticSearchQuery;
    }
  } catch (error) {
    logger(
      "error",
      "Error parsing Gemini response or updating chat state:",
      error,
    );
    throw new Error("Failed to update chat state from Gemini response.");
  }
};

const promptGemini = async (promptTemplate) => {
  try {
    const query = `SELECT
        ml_generate_text_result
        FROM
        ML.GENERATE_TEXT(MODEL ${"`"}${process.env.GCP_PROJECT_ID}.${process.env.GCP_BQ_DATA_SET_ID}.${process.env.GCP_GEMINI_MODEL_ID}${"`"},
        (SELECT '''${promptTemplate}''' AS prompt),
        STRUCT(
            ${process.env.GCP_GEMINI_MODEL_TEMPERATURE} AS temperature, 
            ${process.env.GCP_GEMINI_MODEL_MAX_TOKENS} AS max_output_tokens 
            )
            );`;

    const [rawResponse] = await bigQueryClient.executeQuery(query);
    const parsedData = JSON.parse(rawResponse.ml_generate_text_result);
    const generatedText = parsedData.candidates[0]?.content?.parts[0]?.text;
    return generatedText;
  } catch (e) {
    logger("error", "[prompt-gemini] Error when processing prompt", e);
  }
};

const generateSemanticSearchQuery = async ({ query, numberOfResults }) => {
  try {
    const searchQuery = `
        SELECT DISTINCT base.content , base.id
          FROM VECTOR_SEARCH(
            TABLE ${"`"}${process.env.GCP_PROJECT_ID}.${
              process.env.GCP_BQ_DATA_SET_ID
            }.${process.env.GCP_EMBEDDINGS_TABLE}${"`"},
            'embeddings',
            (
                SELECT  ml_generate_embedding_result
                FROM ML.GENERATE_EMBEDDING(
                MODEL ${"`"}${process.env.GCP_PROJECT_ID}.${
                  process.env.GCP_BQ_DATA_SET_ID
                }.${process.env.GCP_MODEL_ID}${"`"},
                (SELECT '''${query}''' AS content))
            ),
          top_k => ${
            numberOfResults ?? 5
          }, options => '{"fraction_lists_to_search": 1}'
        )
        `;
    const aiResult = await bigQueryClient.executeQuery(searchQuery);
    const bundleIds = aiResult.map((r) => r.id);
    const bundles = await Bundles.find({ _id: { $in: bundleIds } }).lean();
    return bundles;
  } catch (e) {
    logger(
      "error",
      "[generate-semantic-search-query] Error when running the semantic search query",
      e,
    );
  }
};
