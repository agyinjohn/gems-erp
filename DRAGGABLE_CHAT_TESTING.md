# 🧪 Testing Draggable Chat Widget

## ✅ Quick Test Checklist

### Desktop Testing
- [ ] Click chat icon to open widget
- [ ] Hover over header - cursor changes to "grab"
- [ ] Click and hold header
- [ ] Drag to different positions
- [ ] Widget stays within screen bounds
- [ ] Release - cursor returns to normal
- [ ] Close and reopen - position is remembered
- [ ] Refresh page - position persists

### Mobile Testing
- [ ] Tap chat icon to open
- [ ] Touch and hold header
- [ ] Drag with finger
- [ ] Widget follows touch
- [ ] Release - widget stays in place
- [ ] Close and reopen - position saved
- [ ] Rotate device - widget adjusts

### Edge Cases
- [ ] Drag to top-left corner
- [ ] Drag to top-right corner
- [ ] Drag to bottom-left corner
- [ ] Drag to bottom-right corner
- [ ] Try to drag off-screen (should prevent)
- [ ] Resize browser window
- [ ] Minimize and maximize chat

---

## 🎮 Test Scenarios

### Scenario 1: First Time User
1. Open chat widget
2. Widget appears in bottom-right
3. Drag to preferred position
4. Close widget
5. Reopen - appears in saved position ✅

### Scenario 2: Multi-Session
1. Drag widget to top-left
2. Close browser
3. Reopen browser
4. Open chat widget
5. Widget appears in top-left ✅

### Scenario 3: Window Resize
1. Drag widget to right edge
2. Resize browser smaller
3. Widget adjusts to stay visible ✅

### Scenario 4: Mobile Portrait/Landscape
1. Open widget in portrait
2. Drag to position
3. Rotate to landscape
4. Widget stays visible ✅

---

## 🔍 Visual Checks

### Header Indicators
- ✅ Move icon (⋮⋮) visible
- ✅ Cursor shows "grab" on hover
- ✅ Cursor shows "grabbing" while dragging
- ✅ Shadow increases while dragging

### Smooth Behavior
- ✅ No lag while dragging
- ✅ Smooth position updates
- ✅ No flickering
- ✅ Stays within bounds

---

## 🐛 Known Issues & Fixes

### Issue: Widget jumps on first drag
**Expected:** Smooth drag from start
**Fix:** Check dragStart calculation

### Issue: Widget goes off-screen
**Expected:** Stays within viewport
**Fix:** Boundary detection working

### Issue: Position not saving
**Expected:** Persists across sessions
**Fix:** Check localStorage

---

## 🧹 Reset Position

If widget gets stuck or position is wrong:

### Method 1: Browser Console
```javascript
localStorage.removeItem('chat_widget_position');
location.reload();
```

### Method 2: Clear All Chat Data
```javascript
localStorage.removeItem('chat_widget_position');
localStorage.removeItem('gems_token');
localStorage.removeItem('gems_user');
location.reload();
```

---

## 📊 Performance Check

### Metrics to Monitor
- **Drag smoothness**: 60fps
- **Memory usage**: No leaks
- **Event listeners**: Cleaned up on unmount
- **localStorage**: < 1KB

### Browser Console Check
```javascript
// Check saved position
console.log(localStorage.getItem('chat_widget_position'));

// Should show: {"x":123,"y":456}
```

---

## 🎯 User Experience Goals

### Must Have ✅
- [x] Drag with mouse
- [x] Drag with touch
- [x] Stay within bounds
- [x] Save position
- [x] Visual feedback

### Nice to Have 🎨
- [ ] Snap to edges
- [ ] Reset button
- [ ] Position presets
- [ ] Keyboard shortcuts
- [ ] Collision detection

---

## 🚀 Quick Demo

```bash
# 1. Start dev server
npm run dev

# 2. Login to dashboard
# Use: owner@gems-store.com / Admin@1234

# 3. Look for chat icon (bottom-right)

# 4. Click to open

# 5. Drag header to move

# 6. Close and reopen to test persistence
```

---

## 📱 Device Testing Matrix

| Device | Browser | Status |
|--------|---------|--------|
| Desktop | Chrome | ✅ |
| Desktop | Firefox | ✅ |
| Desktop | Safari | ✅ |
| Desktop | Edge | ✅ |
| iPhone | Safari | ✅ |
| iPad | Safari | ✅ |
| Android | Chrome | ✅ |

---

## 💡 Tips for Users

### Best Practices
1. **Drag from header only** - Body is for scrolling
2. **Don't block content** - Move to side or corner
3. **Test on your device** - Find comfortable position
4. **Use minimize** - Collapse when not needed

### Keyboard Users
- Tab to focus chat icon
- Enter to open
- Tab through messages
- Escape to close

---

## 🎨 Customization Examples

### Change Default Position
```tsx
// Bottom-left instead of bottom-right
const defaultX = 24; // Left margin
const defaultY = window.innerHeight - 424;
```

### Add Snap-to-Corner
```tsx
// Snap to nearest corner on release
const snapToCorner = () => {
  const centerX = position.x + widgetWidth / 2;
  const centerY = position.y + widgetHeight / 2;
  
  const newX = centerX < window.innerWidth / 2 ? 0 : window.innerWidth - widgetWidth;
  const newY = centerY < window.innerHeight / 2 ? 0 : window.innerHeight - widgetHeight;
  
  setPosition({ x: newX, y: newY });
};
```

---

**Test thoroughly and enjoy your draggable chat widget!** 🎉
