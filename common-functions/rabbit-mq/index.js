import { connect } from "amqplib";
import dotenv from "dotenv";
import { EventEmitter } from "events";
import Consumer from "./consumer.js";
import Producer from "./producer.js";

dotenv.config();

const Connection = await connect(process.env.RABBITMQ_URL);
const channel = await Connection.createChannel();
const Emitter = new EventEmitter();

const CONSUMER_MAPPER = {};

const RabbitMQ = {
  /**
   * Generates a function comment for the given function body.
   *
   * @param {Object} queueToProduce - The queue to produce.
   * @param {Object} queueToConsume - The queue to consume.
   * @param {Object} data - The data to be used for producing.
   * @return {Object} The result of the produce operation.
   */
  produce: ({ queueToProduce, queueToConsume, data }) => {
    if (queueToConsume && !CONSUMER_MAPPER[`${channel}_${queueToConsume}`]) {
      Consumer.consume({
        channel,
        queueToConsume,
        Emitter,
      });
      CONSUMER_MAPPER[`${channel}_${queueToConsume}`] = true;
    }

    return Producer.produce({
      channel,
      queueToProduce,
      queueToConsume,
      data,
      Emitter,
    });
  },

  /**
   * Consume a specific queue and execute a callback.
   *
   * @param {object} queueToConsume - The queue to consume.
   * @param {function} callback - The callback function to execute.
   * @return {undefined} This function does not return a value.
   */
  consume: ({ queueToConsume, callback }) => {
    Consumer.consume({
      channel,
      queueToConsume,
      Emitter,
      callback,
    });
  },
};

export default RabbitMQ;
