// worker.js

// This code will run in the Web Worker
self.addEventListener('message', function (e) {
  const data = e.data;
  if (!data.gallerytest) {
    return;
  }

  // Perform the long task here
  const result = performLongTask(data.gallerytest);

  // Send the result back to the main thread
  self.postMessage(result);
});

function performLongTask(inputData) {
  console.log("Worker-Input: " + inputData);
  // Simulate a time-consuming task
  let result = 0;
  for (let i = 0; i < inputData; i++) {
    result += i;
  }
  return result;
}