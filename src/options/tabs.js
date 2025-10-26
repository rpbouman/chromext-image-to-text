function getTab(id){
  var tab = document.querySelector(`*[role=tablist] > div:has( > label[role=tab][for="${id}"] + input[type=radio]#${id} + *[role=tabpanel] )`);
  return tab;
}

function getTabPanel(id){
  var tab = getTab(id);
  var tabPanel = tab.querySelector('div[role=tabpanel]');
  return tabPanel;
}

function addTabSelectionChangedHandler(tabList, handler){
  var tabs = tabList.querySelectorAll('label[role=tab] + input[type=radio][name=tabs]');
  for (var i = 0; i < tabs.length; i++) {
    var tab = tabs.item(i);
    tab.addEventListener('change', handler);
  }
}

function getSelectedTab(tablist){
  var tab = tablist.querySelector('label[role=tab] + input[type=radio][name=tabs]:checked');
  return tab;
}

