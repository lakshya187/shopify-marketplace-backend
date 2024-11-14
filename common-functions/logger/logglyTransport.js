import { Loggly } from "winston-loggly-bulk";

export default class LogglyTransport extends Loggly {
  // constructor(opts) {
  // 	super(opts);
  // }

  log(info, callback) {
    const newInfo = { ...info };
    setImmediate(() => {
      this.emit("logged", newInfo);
    });

    if (newInfo.error) {
      const { error } = newInfo;

      let newStack = null;
      if (error.stack) {
        newStack = error.stack;
      } else if (error.error) {
        if (error.error.stack) {
          newStack = error.error.stack;
        }
      }
      newInfo.error = {
        message: error.message,
        stack: newStack,
      };
    }

    super.log(newInfo, callback);
  }
}
