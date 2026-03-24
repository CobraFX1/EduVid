<template>
  <div class="skel-card glass-card">
    <div class="skel-thumb animated-bg"></div>
    <div class="skel-info">
      <div class="skel-bot">
        <div class="skel-avatar animated-bg"></div>
        <div style="flex:1;">
          <div class="skel-line animated-bg" style="width: 80%; height: 18px; margin-bottom: 0.6rem"></div>
          <div class="skel-line animated-bg" style="width: 60%; height: 14px;"></div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.skel-card { 
  display: flex; flex-direction: column; gap: 1rem; 
  padding: 0.75rem; border: none; background: transparent; 
}
.skel-thumb { 
  width: 100%; aspect-ratio: 16/9; border-radius: 12px; 
}
.skel-bot { 
  display: flex; gap: 0.75rem; align-items: flex-start; 
}
.skel-avatar { 
  width: 36px; height: 36px; border-radius: 50%; flex-shrink: 0; 
}
.skel-line { 
  border-radius: 6px; 
}
</style>
