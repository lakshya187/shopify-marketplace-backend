const promisify =
  (fn) =>
  (...args) =>
    new Promise((resolve, reject) => {
      fn(...args, (err, result) => {
        if (err) {
          console.log("error ocurred: ", err);
          reject(err);
        } else {
          resolve(result);
        }
      });
    });

export default promisify;
