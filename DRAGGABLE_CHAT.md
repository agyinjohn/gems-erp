# 🎯 Draggable Chat Widget

## ✨ Features

### 1. **Drag & Drop**
- Click and hold the header to drag
- Works on desktop (mouse) and mobile (touch)
- Visual feedback with cursor change

### 2. **Smart Boundaries**
- Widget stays within viewport
- Can't be dragged off-screen
- Automatically adjusts on window resize

### 3. **Position Memory**
- Remembers last position
- Saved in localStorage
- Persists across sessions

### 4. **Visual Indicators**
- Move icon (⋮⋮) shows it's draggable
- Cursor changes to "grab" on hover
- Cursor changes to "grabbing" while dragging

---

## 🎮 How to Use

### Desktop
1. Click and hold the chat header
2. Drag to desired position
3. Release to drop
4. Position is automatically saved

### Mobile
1. Touch and hold the chat header
2. Drag with your finger
3. Release to drop
4. Position is saved

---

## 🔧 Technical Details

### Drag Handle
```tsx
// Only the header is draggable
<div className="drag-handle cursor-grab active:cursor-grabbing">
  <Move className="w-3.5 h-3.5" /> {/* Visual indicator */}
  Support Chat
</div>
```

### Position State
```tsx
const [position, setPosition] = useState({ x: 0, y: 0 });
const [isDragging, setIsDragging] = useState(false);
```

### Boundary Detection
```tsx
// Keep within viewport
const maxX = window.innerWidth - widgetWidth;
const maxY = window.innerHeight - widgetHeight;

setPosition({
  x: Math.max(0, Math.min(newX, maxX)),
  y: Math.max(0, Math.min(newY, maxY))
});
```

### Position Persistence
```tsx
// Save on drag end
localStorage.setItem('chat_widget_position', JSON.stringify(position));

// Load on mount
const saved = localStorage.getItem('chat_widget_position');
if (saved) setPosition(JSON.parse(saved));
```

---

## 🎨 Styling

### Cursor States
- **Default**: `cursor-default`
- **Hover header**: `cursor-grab`
- **Dragging**: `cursor-grabbing`

### Visual Feedback
- Move icon shows draggable area
- Smooth transitions
- Shadow increases while dragging (optional)

---

## 📱 Responsive Behavior

### Desktop (≥1024px)
- Full drag functionality
- Mouse events
- Precise positioning

### Tablet (768px - 1023px)
- Touch events
- Larger drag handle
- Snap to edges (optional)

### Mobile (<768px)
- Touch optimized
- Full-screen option (optional)
- Bottom position default

---

## 🔄 Default Positions

### First Open (No Saved Position)
```tsx
// Bottom-right corner
const defaultX = window.innerWidth - 344;  // 320px + 24px margin
const defaultY = window.innerHeight - 424; // ~400px + 24px margin
```

### Saved Position
```tsx
// Uses last saved position from localStorage
```

---

## 🛠 Customization

### Change Default Position
```tsx
// In ChatWidget.tsx
useEffect(() => {
  if (open && position.x === 0 && position.y === 0) {
    setPosition({ 
      x: window.innerWidth - 344,  // Adjust X
      y: window.innerHeight - 424  // Adjust Y
    });
  }
}, [open]);
```

### Add Snap-to-Edge
```tsx
const handleMouseUp = () => {
  setIsDragging(false);
  
  // Snap to nearest edge
  const snapThreshold = 50;
  if (position.x < snapThreshold) {
    setPosition(prev => ({ ...prev, x: 0 }));
  }
  if (position.x > window.innerWidth - widgetWidth - snapThreshold) {
    setPosition(prev => ({ ...prev, x: window.innerWidth - widgetWidth }));
  }
  
  localStorage.setItem('chat_widget_position', JSON.stringify(position));
};
```

### Add Reset Button
```tsx
// In header
<button 
  onClick={() => {
    const defaultPos = { 
      x: window.innerWidth - 344, 
      y: window.innerHeight - 424 
    };
    setPosition(defaultPos);
    localStorage.setItem('chat_widget_position', JSON.stringify(defaultPos));
  }}
  className="text-white/70 hover:text-white"
>
  <RotateCcw className="w-4 h-4" />
</button>
```

---

## 🐛 Troubleshooting

### Widget goes off-screen
**Cause:** Window resized or saved position invalid

**Fix:** Clear localStorage
```javascript
localStorage.removeItem('chat_widget_position');
```

### Can't drag on mobile
**Cause:** Touch events not working

**Fix:** Check `onTouchStart` is attached to widget container

### Position not saving
**Cause:** localStorage blocked or full

**Fix:** Check browser settings, clear old data

---

## 🎯 User Benefits

1. **Flexibility** - Place widget anywhere
2. **Convenience** - Doesn't block content
3. **Persistence** - Remembers preference
4. **Intuitive** - Familiar drag behavior
5. **Accessible** - Works on all devices

---

## 🚀 Future Enhancements

### Possible Additions
- [ ] Snap to corners/edges
- [ ] Minimize to icon only
- [ ] Multiple size options
- [ ] Keyboard shortcuts (arrow keys)
- [ ] Double-click to reset position
- [ ] Collision detection with other elements
- [ ] Smooth animations
- [ ] Position presets (corners, center)

### Advanced Features
```tsx
// Snap to grid
const snapToGrid = (pos: { x: number; y: number }) => {
  const gridSize = 20;
  return {
    x: Math.round(pos.x / gridSize) * gridSize,
    y: Math.round(pos.y / gridSize) * gridSize
  };
};

// Magnetic edges
const magneticEdge = (pos: { x: number; y: number }) => {
  const magnetThreshold = 30;
  if (pos.x < magnetThreshold) return { ...pos, x: 0 };
  if (pos.x > window.innerWidth - widgetWidth - magnetThreshold) {
    return { ...pos, x: window.innerWidth - widgetWidth };
  }
  return pos;
};
```

---

## 📝 Code Summary

**Key Changes:**
1. Added drag state management
2. Implemented mouse & touch handlers
3. Added boundary detection
4. Saved position to localStorage
5. Added visual indicators (Move icon, cursor)

**Files Modified:**
- `components/ChatWidget.tsx` - Main implementation

**Dependencies:**
- `lucide-react` - Move icon
- No additional packages needed!

---

**The chat widget is now fully draggable and remembers its position!** 🎉
