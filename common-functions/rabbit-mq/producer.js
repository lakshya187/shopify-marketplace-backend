import { randomUUID } from "crypto";

const Producer = {
  /**
   * Asynchronously produces a message to a specified queue using a producer channel.
   *
   * @param {Object} options - An object containing the following properties:
   *   @property {Object} options.channel - The producer channel to use.
   *   @property {string} options.queueToProduce - The queue to produce the message to.
   *   @property {string} options.queueToConsume - The queue to consume the response from.
   *   @property {any} options.data - The data to send in the message.
   *   @property {string} options.correlationId - The correlation ID for the message.
   *   @property {Object} options.Emitter - An event emitter object to listen for the response.
   * @return {Promise<any>} A promise that resolves with the response from the consumer queue.
   */
  async produce({
    channel,
    queueToProduce,
    queueToConsume,
    data,
    correlationId,
    Emitter,
  }) {
    let reqIdentifier = correlationId;
    if (!reqIdentifier) reqIdentifier = randomUUID();

    channel.sendToQueue(queueToProduce, Buffer.from(JSON.stringify(data)), {
      ...(queueToConsume ? { replyTo: queueToConsume } : {}),
      correlationId: reqIdentifier,
      expiration: 10,
    });

    if (!queueToConsume) return true;
    return new Promise((resolve, reject) => {
      try {
        Emitter.once(reqIdentifier, async (result) => {
          const reply = JSON.parse(result.content.toString());
          resolve(reply);
        });
      } catch (error) {
        reject(error);
      }
    });
  },
};

export default Producer;
