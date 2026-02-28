import React from 'react';

interface ContextMenuProps {
  x: number;
  y: number;
  onClose: () => void;
  onDelete?: () => void;
  onNest?: () => void;
  onConfigure?: () => void;
}

const ContextMenu: React.FC<ContextMenuProps> = ({ x, y, onClose, onDelete, onNest, onConfigure }) => {
  // Adjust position to keep within viewport
  const style = {
    top: y,
    left: x,
  };

  const handleAction = (action?: () => void) => {
    if (action) action();
    onClose();
  };

  return (
    <>
      {/* Overlay to close on click outside */}
      <div 
        className="fixed inset-0 z-40" 
        onClick={onClose} 
        onContextMenu={(e) => { e.preventDefault(); onClose(); }}
      ></div>
      
      {/* Menu Container - Resized to approx 160px width */}
      <div 
        className="fixed z-50 w-[160px] bg-white border border-black rounded-lg shadow-xl overflow-hidden font-sans text-xs select-none"
        style={style}
        onContextMenu={(e) => e.preventDefault()}
      >
        {/* Header */}
        <div className="bg-white py-0.5 text-center border-b border-gray-100">
          <span className="font-extrabold text-black text-xs tracking-wide">OTP</span>
        </div>

        {/* Menu Items */}
        <div className="flex flex-col py-0.5 bg-white bg-opacity-95">
          <MenuItem 
            icon="grid_view" 
            label="Nest" 
            iconColor="text-red-600" 
            shortcut="N" 
            onClick={() => handleAction(onNest)}
          />
          <MenuItem icon="format_list_numbered" label="Re-order Parts" iconColor="text-gray-800" />
          <MenuItem icon="save" label="Save NestList" iconColor="text-gray-600" shortcut="N" />
          <MenuItem 
            icon="build" 
            label="Configure" 
            iconColor="text-gray-600" 
            onClick={() => handleAction(onConfigure)}
          />
          <MenuItem icon="filter_1" label="Count Existing Parts" iconColor="text-gray-800" shortcut="E" />
          
          <div className="h-px bg-gray-200 my-0.5 mx-2"></div>
          
          <MenuItem icon="note_add" label="Add Parts" iconColor="text-red-600" shortcut="P" />
          <MenuItem 
            icon="close" 
            label="Delete" 
            iconColor="text-red-600" 
            iconBold 
            onClick={() => handleAction(onDelete)}
          />
          
          <div className="h-px bg-gray-200 my-0.5 mx-2"></div>
          
          <MenuItem icon="content_paste" label="Paste" iconColor="text-gray-400" disabled />
          <MenuItem icon="content_paste_go" label="Paste As New List" iconColor="text-gray-400" disabled />
        </div>

        {/* Footer */}
        <div className="flex border-t-2 border-black bg-white">
          <button 
            onClick={onClose}
            className="flex-1 py-1 text-center font-black text-xs hover:bg-gray-100 active:bg-gray-200 uppercase"
          >
            OK
          </button>
          <div className="w-0.5 bg-black"></div>
          <button 
            onClick={onClose}
            className="flex-1 py-1 text-center font-black text-xs hover:bg-gray-100 active:bg-gray-200 uppercase"
          >
            CANCEL
          </button>
        </div>
      </div>
    </>
  );
};

interface MenuItemProps {
  icon: string;
  label: string;
  iconColor?: string;
  disabled?: boolean;
  shortcut?: string;
  iconBold?: boolean;
  onClick?: () => void;
}

const MenuItem: React.FC<MenuItemProps> = ({ icon, label, iconColor = "text-gray-600", disabled, shortcut, iconBold, onClick }) => {
  // Reduced padding and font sizes for compact view
  return (
    <div 
      onClick={!disabled ? onClick : undefined}
      className={`flex items-center px-2 py-0.5 hover:bg-blue-50 cursor-pointer ${disabled ? 'opacity-50 pointer-events-none' : ''}`}
    >
      <div className="w-5 flex justify-center">
        <span className={`material-icons-outlined text-sm ${iconColor} ${iconBold ? 'font-bold' : ''}`}>{icon}</span>
      </div>
      <span className={`ml-1.5 text-[10px] leading-tight text-gray-800 ${disabled ? 'text-gray-400' : ''}`}>
        {renderLabelWithShortcut(label, shortcut)}
      </span>
    </div>
  );
};

// Simple helper to underline the shortcut character
const renderLabelWithShortcut = (label: string, shortcut?: string) => {
  if (!shortcut) return label;
  
  const index = label.indexOf(shortcut);
  if (index === -1) return label;

  return (
    <>
      {label.substring(0, index)}
      <span className="underline decoration-red-500 decoration-1 underline-offset-2">{label[index]}</span>
      {label.substring(index + 1)}
    </>
  );
};

export default ContextMenu;