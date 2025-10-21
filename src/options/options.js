function getSidebarItems(){
  var sidebarItems = document.getElementById('sidebarItems');
  return sidebarItems;
}

function updateForm(item){
  var currentItemForm = document.getElementById('currentItemForm');
  var currentItemFormElements = currentItemForm.elements;
  for (var property in item){
    var currentItemFormElement = currentItemFormElements[property];
    if (!currentItemFormElement){
      continue;
    }
    
    var value = item[property];
    if (currentItemFormElement.type === 'file') {
      var image = document.getElementById('image');
      if (!value){
        value = '../images/icon16x16.png';
      }
      image.src = value;
    }
    else {
      currentItemFormElement.value = value;
    }
  }
  setFormStateDirty(false);
}

function getFormData(){
  var currentItemForm = document.getElementById('currentItemForm');
  var currentItemFormElements = currentItemForm.elements;
  var item = {};
  for (var element in currentItemFormElements) {
    var currentItemFormElement = currentItemFormElements[element];
    var value;
    switch (currentItemFormElement.tagName) {
      case 'INPUT':
        if (currentItemFormElement.type === 'file') {
          value = document.getElementById('image').src;
          break;
        }
      default:
        value = currentItemFormElement.value;
        break;
    }
    item[currentItemFormElement.name] = value;
  }
  return item;
}

async function sidebarItemChangeHandler(event){
  var input = event.target;
  if (!input.checked) {
    return;
  }
  var id = input.id;
  var item = await getItem(id);
  updateForm(item);
}

function getCurrentItemId(){
  var currentItem = getCurrentSidebarItem();
  var input = currentItem.querySelector('input[type=radio]');
  var id = input.id;
  return id;
}

function getCurrentSidebarItem(){
  var sidebarItems = document.getElementById('sidebarItems');
  var item = sidebarItems.querySelector('li:has( > input[type=radio]:checked)');
  return item;
}

function updateCurrentSidebarItemFromForm(){
  var sidebarItem = getCurrentSidebarItem();
  var currentItemForm = document.getElementById('currentItemForm');
  sidebarItem.querySelector('label').textContent = currentItemForm['name'].value;
  var iconSrc = currentItemForm.querySelector('img').src;
  if (!iconSrc){
    iconSrc = '../images/icon16x16.png';
  }
  sidebarItem.querySelector('img').src = iconSrc;
}

function instantiateSidebarItem(id){
  var sidebarItemTemplate = document.getElementById('sidebarItem');
  var sidebarItem = sidebarItemTemplate.content.cloneNode(true);
  var label = sidebarItem.querySelector('label');
  var input = sidebarItem.querySelector('input[type=radio]');
  input.addEventListener('change', sidebarItemChangeHandler)
  input.setAttribute('id', id);
  label.setAttribute('for', id);
  return sidebarItem;
}

function addSidebarItem(promptInfo) {
  var sidebarItems = getSidebarItems();
  var sidebarItem = instantiateSidebarItem(promptInfo.id);
  sidebarItems.appendChild(sidebarItem);
  sidebarItems = sidebarItems.getElementsByTagName('li');
  sidebarItem = sidebarItems[sidebarItems.length - 1];
  
  var label = sidebarItem.querySelector('label');
  label.textContent = promptInfo.name;
  var icon = sidebarItem.querySelector('img');
  var src = promptInfo.icon;
  if (!src){
    src = '../images/icon16x16.png';
  }
  icon.src = src;
  
  return sidebarItem;
}

async function getPromptsFromStorage(){
  var prompts = await chrome.storage.local.get('prompts');
  if (!prompts) {
    prompts = {
      list: []
    };
  }
  else 
  if (!prompts.prompts.list){
    prompts.prompts.list = [];
    await chrome.storage.local.set(prompts);
  }
  var list = prompts.prompts.list;
  return list;
}

async function storePromptsToStorage(prompts){
  return await chrome.storage.local.set({
    prompts: {
      list: prompts
    }
  });  
}

async function loadOptions(event){
  var prompts = await getPromptsFromStorage();
  for (var i = 0; i < prompts.length; i++){
    var promptInfo = prompts[i];
    addSidebarItem(promptInfo);
  }
}

async function addNewClickedHandler(event){
  var newItem = {
    id: crypto.randomUUID(),
    name: 'New prompt',
    icon: '',
    prompt: '',
    responseConstraint: ''
  };
  var prompts = await getPromptsFromStorage();
  prompts.push(newItem);
  await storePromptsToStorage(prompts);
  var sidebarItem = addSidebarItem(newItem);
  sidebarItem.querySelector('input[type=radio]').click();
  updateForm();
  document.getElementById('name').select();
  document.getElementById('name').focus();
}

async function findItemIndex(id){
  var prompts = await getPromptsFromStorage();
  var index = prompts.findIndex(function(item){
    return item.id === id;
  }); 
  return index;
}

async function getItem(id){
  var index = await findItemIndex(id);
  if (index === -1) {
    return undefined;
  }
  var prompts = await getPromptsFromStorage();
  var item = prompts[index];
  return item;
}

async function deleteCurrentClickedHandler(event){
  var currentSidebarItem = getCurrentSidebarItem();
  if (!currentSidebarItem){
    return;
  }
  var id = currentSidebarItem.querySelector('input[type=radio]').id;
  var prompts = await getPromptsFromStorage();
  var index = findItemIndex(id);
  if (index !== -1){
    prompts.splice(index, 1);
    await storePromptsToStorage(prompts);
  }
  var sidebar = currentSidebarItem.parentNode;
  sidebar.removeChild(currentSidebarItem);
}

async function restoreCurrentClickedHandler(event){
  var id = getCurrentItemId();
  var item = await getItem(id);
  updateForm(item);
  updateCurrentSidebarItemFromForm();
}

async function saveCurrentClickedHandler(event){
  var id = getCurrentItemId();
  var index = await findItemIndex(id);  
  var prompts = await getPromptsFromStorage();
  prompts[index] = getFormData();
  await storePromptsToStorage(prompts);
  setFormStateDirty(false);
}

function setFormStateDirty(state){
  var currentItemForm = document.getElementById('currentItemForm');
  currentItemForm.setAttribute('data-dirty', Boolean(state));  
}

function formChangedHandler(event){
  setFormStateDirty(true);
  
  var target = event.target;
  var currentItem = getCurrentSidebarItem();
  switch (target.id) {
    case 'name':
    case 'id':
      updateCurrentSidebarItemFromForm();
      break;
    default:
  }
}

document.getElementById('name').addEventListener('input', formChangedHandler);
document.getElementById('icon').addEventListener('change', formChangedHandler);
document.getElementById('prompt').addEventListener('input', formChangedHandler);
document.getElementById('responseConstraint').addEventListener('input', formChangedHandler);

document.getElementById('addNew').addEventListener('click', addNewClickedHandler);
document.getElementById('saveCurrent').addEventListener('click', saveCurrentClickedHandler);
document.getElementById('deleteCurrent').addEventListener('click', deleteCurrentClickedHandler);
document.getElementById('restoreCurrent').addEventListener('click', restoreCurrentClickedHandler);
document.addEventListener('DOMContentLoaded', loadOptions);
