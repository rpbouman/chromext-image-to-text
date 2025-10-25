chrome.runtime.onMessage.addListener(handleMessage);

function handleMessage(message, sender, sendResponse) {

  var proxyHandler = async function(sendResponse){
    if (message.target !== 'offscreen/document.html') {
      return;
    }

    var response;
    var returnMessage = {
      type: message.type,        
    };      
    
    var payload = message.payload;
    try {
      switch (message.type) {
        case 'copy-data-to-clipboard':
          response = handleClipboardWrite(payload);
          break;
        case 'render-image':
          response = await handleRenderImage(payload);
          break;
        default:
          console.warn(`Unexpected message type received: '${message.type}'.`);
      }
      returnMessage.response = response;
    }
    catch(e){
      returnMessage.error = {
        type: e.name,
        message: e.message
      };
    }
    finally {
      sendResponse(returnMessage);    
      window.close();
    }
  };
  proxyHandler(sendResponse);
  return true;
}

const textEl = document.querySelector('#text');
async function handleClipboardWrite(payload) {
  var text = payload.text;  
  var result = {};
  try {
    if (typeof text !== 'string') {
      throw new TypeError(
        `Value provided must be a 'string', got '${typeof text}'.`
      );
    }

    textEl.value = text;
    textEl.select();
    document.execCommand('copy');
    result.success = true;
  } 
  catch (e){
    result.error = {
      type: e.name,
      message: e.message
    }
  }
  finally {
  }
  return result;
}

function fixBackground(canvas, color){
  var context = canvas.getContext('2d');
  context.fillStyle = color;
  context.fillRect(0, 0, canvas.width, canvas.height);
}

async function handleRenderImage(payload){
  var srcUrl = payload.srcUrl;
  var backgroundColor = payload.backgroundColor; 
  return new Promise(function(resolve, reject){
    var image = new Image();
    
    image.addEventListener('load', async function(event){
      var img = event.target;
      var canvas = new OffscreenCanvas(img.width, img.height);
      var context = canvas.getContext('2d');
      fixBackground(canvas, 'white');
      context.drawImage(img, 0, 0);
      var blob = await canvas.convertToBlob();
      var arrayBuffer = await blob.arrayBuffer();
      var uint8Array = new Uint8Array(arrayBuffer);
      var base64 = uint8Array.toBase64();
      resolve({
        base64: base64,
        type: blob.type
      });
    }, {once: true});
    
    image.addEventListener('error', function(event){
      debugger;
      reject(new Error());
    }, {once: true});
    
    image.src = srcUrl;
  });
}