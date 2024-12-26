class VisibilityTracker {
    constructor(options = {}) {
      this.visibleElements = new Set();
      this.options = {
        threshold: 0.2,
        trackingSelector: '*',
        ...options
      };
  
      this.observer = new IntersectionObserver(
        (entries) => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              this.visibleElements.add(entry.target);
              console.log('Element became visible:', entry.target);
            } else {
              this.visibleElements.delete(entry.target);
              console.log('Element no longer visible:', entry.target);
            }
          });
        },
        {
          threshold: this.options.threshold,
          rootMargin: '0px'
        }
      );
  
      setTimeout(() => this.startTracking(), 2000);
    }
  
    startTracking() {
      const elements = document.querySelectorAll(this.options.trackingSelector);
      console.log(`Starting to track ${elements.length} elements`);
      elements.forEach(element => {
        this.observer.observe(element);
      });
    }
  
    getVisibleElements() {
      return Array.from(this.visibleElements);
    }
  
    stopTracking() {
      this.observer.disconnect();
      this.visibleElements.clear();
    }
  }
  
  const tracker = new VisibilityTracker({
    threshold: 0.2,
    trackingSelector: '*'
  });