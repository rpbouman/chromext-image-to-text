chrome.runtime.onMessage.addListener(handleMessages);

async function handleMessages(message, sender, sendResponse) {
  if (message.target !== 'offscreen-doc') {
    return;
  }

  switch (message.type) {
    case 'copy-data-to-clipboard':
      var result = handleClipboardWrite(message.text);
      var message = {
        type: message.type,        
      };      
      message[result === true ? 'success' : 'error'] = result;
      break;
    default:
      console.warn(`Unexpected message type received: '${message.type}'.`);
  }
  
  sendResponse(message);
}

const textEl = document.querySelector('#text');

async function handleClipboardWrite(text) {
  var result;
  try {
    if (typeof text !== 'string') {
      throw new TypeError(
        `Value provided must be a 'string', got '${typeof text}'.`
      );
    }

    textEl.value = text;
    textEl.select();
    document.execCommand('copy');
    result = true;
  } 
  catch (e){
    result = e.message;
  }
  finally {
    window.close();
  }
  return result;
}