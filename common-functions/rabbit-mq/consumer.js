import Producer from "./producer.js";

const Consumer = {
  /**
   * Consume messages from a queue and process them asynchronously.
   *
   * @param {object} options - An object containing the following properties:
   *   @property {Object} options.channel - The producer channel to use.
   *   @property {string} queueToConsume - The name of the queue to consume from.
   *   @property {function} callback - The callback function to process the message.
   *   @property {object} Emitter - The event emitter object.
   * @return {void}
   */
  consume: ({ channel, queueToConsume, callback, Emitter }) => {
    const { queue: consumerQueue } = channel.assertQueue(queueToConsume, {
      exclusive: false,
    });

    channel.consume(
      consumerQueue,
      async (message) => {
        let data = {};
        if (callback) data = await callback(message);
        const { correlationId, replyTo } = message.properties;

        if (replyTo) {
          await Producer.produce({
            channel,
            queueToProduce: replyTo,
            data: data ?? {},
            correlationId,
            Emitter,
          });
        } else {
          Emitter.emit(message.properties.correlationId.toString(), message);
        }
      },
      {
        noAck: true,
      },
    );
  },
};

export default Consumer;
