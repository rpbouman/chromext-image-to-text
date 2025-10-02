var baseModel;

async function fetchImageAsBlob(srcUrl) {
  var response = await fetch(srcUrl);
  var blob = await response.blob();
  return blob;
}

async function getImageData(message){
  var imageData;
  if (message.base64) {
    var array = Uint8Array.fromBase64(message.base64);
    imageData = new Blob([array], {type: message.type});
  }
  else
  if (message.srcUrl){
    imageData = await fetchImageAsBlob(message.srcUrl);
  }
  return imageData;
}

async function getBaseModel(){
  try {
    if (baseModel === undefined){
      baseModel = await LanguageModel.create({
        expectedInputs: [{type: 'image'}],
        initialPrompts: [
          {
            role: 'system', 
            content: [
              'You are an expert at extracting text from images uploaded by the user. If the image is a: ',
              '- screenshot of a bookpage or article then extract the text and use markdown to convey structure and style.',
              '- screenshot of a code editor or IDE, or contains areas like that, then in addition to a general description of the image, return the code in a markdown codeblock.',
              '- photograph, then describe the scene. If it has captions, extract those and describe their placement. If there are items in the scene with text on them, then extract those and metion them in the scene description.',
              '- flag or heraldic emblem, then extract any text. Describe its color, shape and affect. If you can identify a nationality, period, house, order, or family, mention their name(s).',
              '- logo, then extract all text. Describe its color, shape and affect. If you can identify a brand, musical band, company or organization, mention its name.',
              '- diagram, then list its elements. Mention their shape (i.e. rectangle, diamond), color and text labels. If the elements are composite (for example, a table with columns) then nest the list and mention those constituent elements as well. Make a separate list of the relationships between the elements, describing the color and style of the lines connecting them (for example, solid, dashed, etc), and the symbol appearing at the ends of the line that connect to the elements (for example, arrowhead) and mentioning any labels that appear to describethe relationshipt. If the diagram as a whole has a title, then this should precedede the description.',
              '- screenshot of a table, excel worksheet, data grid, or if it contains areas that match such things, then return those tables in a format that would allow them to be easily pasted to Excel.',
              '- graph or chart (i.e a data visualization) then first determine the type of chart, and mention that in the text output. Then identifiy the numbers and units on the axes, and mention them. Then try to identify how any data series are shown, and mention them, describing their color and/or symbol used to plot the data points. Finally, evaluate each series separately, and list each data point, mentioning the values on the respective axes. For continuous graph types like line charts, do it for the smallest tickmarks you can identify along the axes. Make sure the series can be pasted easily to Excel.',
              //'Regardless of the type of image, assess the possibility the image was made up or fabricated with AI to resemble a genuine image and express that as a percentage. Comment on which features guided that assesment.'
            ].join('\r\n')
          }
        ],
        monitor: function(m){
          m.addEventListener('downloadprogess', async function(e){
            updateDialog({
              progress2: (e.loaded * 1000)
            })
          })
        }
      });      
    }
  }
  catch(e) {
    throw e;
  }
  finally {
  }    
  return baseModel;
}

async function getModel(){
  var model;
  try {
    if (baseModel === undefined){
      baseModel = await getBaseModel();
    }
    model = await baseModel.clone();
  }
  catch(e) {
    switch (e.name){
      case 'InvalidStateError':
        switch (e.message){
          case 'The session cannot be cloned.':
            baseModel.destroy();
            baseModel = undefined;
            break;
        }
        break;
    }
    throw e;
  }
  finally {
  } 
  return model;
}

async function copyToClipboard(text){
  navigator.clipboard.writeText(text);
}

function createDialog(){
  var id = chrome.runtime.id;

  var dialog = document.createElement('dialog');
  document.body.appendChild(dialog);

  dialog.setAttribute('id', id);
  dialog.setAttribute('class', 'image-to-text');

  var header = document.createElement('header');
  dialog.appendChild(header);

  var img = document.createElement('img');
  img.src = chrome.runtime.getURL('images/icon16x16.png');
  header.appendChild(img);

  var section = document.createElement('section');
  dialog.appendChild(section);

  var textSpan = document.createElement('span');
  section.appendChild(textSpan);
  
  var progress = document.createElement('progress');
  progress.setAttribute('max', 50);
  section.appendChild(progress);

  var progress2 = document.createElement('progress');
  progress2.setAttribute('max', 100);
  section.appendChild(progress2);

  var outputSpan = document.createElement('span');
  section.appendChild(outputSpan);

  var footer = document.createElement('footer');
  dialog.appendChild(footer);  
  
  var button = document.createElement('button');
  footer.appendChild(button);
  button.addEventListener('click', function(){
    dialog.close();
  });

  return dialog;
}

function updateDialog(options){
  var dialog = getDialog();
  
  var progressElements = dialog.querySelectorAll('section > progress');
  var progress = options.progress;
  if (progress !== undefined) {

    progressElements.item(0).value = progress;
  }

  var progress2 = options.progress2;
  var progressElement2 = progressElements.item(1);
  if (progress2 === undefined) {
    progressElement2.value = 0;
  }
  else {
    progressElement2.value = progress2;
  }

  var message = options.message;
  if (message !== undefined) {
    var messageText = dialog.querySelector('section > span');
    messageText.textContent = message;
  }
  
  var output = options.output;
  if (output !== undefined) {
    var outputText = dialog.querySelector('section > progress + span');
    outputText.textContent = output;
  }
  
  var message = options.message;
}

function getDialog(){
  var id = chrome.runtime.id;
  var dialog = document.getElementById(id);
  if (dialog === null){
    dialog = createDialog();
  }
  return dialog;
}

async function imageToText(request){
  var message = '';
  var dialog = getDialog();
  dialog.showModal();
  var model;
  try {
    updateDialog({
      message: 'Getting image',
      progress: '0',
      progress2: '0',
      output: ''
    });
    var imageData = await getImageData(request); 
    
    updateDialog({
      message: 'Getting model',
      progress: '10'
    });
    
    model = await getModel();
    updateDialog({
      message: 'Analyzing image',
      progress: '20'
    });
    var responseStream = await model.promptStreaming([{
      role: 'user',
      content: [{type: 'image', value: imageData}]
    }]);

    var progress2 = 0;
    updateDialog({
      message: 'Waiting for output',
      progress: '30',
      progress2: progress2
    });
    
    for await (var chunk of responseStream) {
      message += chunk;
      if (progress2 === 0){
        updateDialog({
          message: 'Generating output',
          progress: '40',
        });
      }
      progress2 = progress2 === 100 ? 0 : progress2 + 1;
      updateDialog({
        output: message.slice(message.length - 35),
        progress2: progress2
      });
    }
    updateDialog({
      message: 'Output copied to clipboard',
      progress: '50',
      output: ''
    });
  }
  catch (e){
    updateDialog({
      message: e.name,
      progress: '100',
      output: e.message
    });
    throw e;
  }
  finally {
    try {
      if (model) {
        model.destroy();
      }
    }
    catch(e){
      console.error(e);
    }
  }
  return message;  
}

// note:
// having an async handler needs some tricky syntax to work in such a way that the message sender 
// (background script in this case)
// can actually await the response.
// see:
// https://stackoverflow.com/questions/48107746/chrome-extension-message-not-sending-response-undefined
//
function handleMessage(message, sender, sendResponse) {
  var imageSrcUrl = message.image.srcUrl;
  var response = {
    type: message.type,
    image: {
      srcUrl: imageSrcUrl
    },
  }
  
  var proxyHandler = async function(sendResponse){
    switch (message.type){
      case 'alert-no-language-model':
        alert([
          'LanguageModel not found.',
          'To fix the issue, navigate to the enable "Promt API for Gemini mini" flag and enable it.',
          'For your convenience, this flag has been copied to the clipbaord.',
        ].join('\r\n'));
        break;
      case 'image-to-text':
        try {
          var text = await imageToText(message.image);
          response.text = text;
          response.success = true;
        }
        catch (e) {
          response.errorType = e.name;
          response.errorMessage = e.message;
        }
        break;
    }
    sendResponse(response);
  };
  
  proxyHandler(sendResponse);
  return true;
}

chrome.runtime.onMessage.addListener(handleMessage);