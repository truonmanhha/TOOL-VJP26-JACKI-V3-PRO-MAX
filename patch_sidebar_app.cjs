const fs = require('fs');
const file = 'components/NestingAXApp.tsx';
let content = fs.readFileSync(file, 'utf8');

const oldSidebar = `<Sidebar 
          nestLists={nestLists} 
          activeListId={activeListId}
          onSelectNestList={handleSelectList}
          parts={currentParts} 
          onContextMenu={handleContextMenu}
          onPartContextMenu={handlePartContextMenu}
          onSelectPart={handleSelectPart}
          activePartId={activePartId}
          nestingMethod={nestingMethod}
        />`;

const newSidebar = `<Sidebar 
          nestLists={nestLists} 
          activeListId={activeListId}
          onSelectNestList={handleSelectList}
          parts={currentParts} 
          onContextMenu={handleContextMenu}
          onPartContextMenu={handlePartContextMenu}
          onSelectPart={handleSelectPart}
          activePartId={activePartId}
          nestingMethod={nestingMethod}
          onUpdatePart={handleUpdatePart}
        />`;

content = content.replace(oldSidebar, newSidebar);
fs.writeFileSync(file, content);
