export const showToast = (content: string): void => {
  // Remove any existing toast
  const existingToast = document.querySelector(".toast");
  if (existingToast) {
    existingToast.remove();
  }

  const toast = document.createElement("div");
  toast.className = "toast";
  toast.style.position = "fixed";
  toast.style.top = "10px";
  toast.style.right = "10px";
  toast.style.backgroundColor = "#1f2937"; // Equivalent to bg-gray-900
  toast.style.color = "#ffffff"; // Equivalent to text-white
  toast.style.paddingLeft = "1rem"; // Equivalent to px-4
  toast.style.paddingRight = "1rem"; // Equivalent to px-4
  toast.style.paddingTop = "0.5rem"; // Equivalent to py-2
  toast.style.paddingBottom = "0.5rem"; // Equivalent to py-2
  toast.style.borderRadius = "0.5rem"; // Equivalent to rounded-lg
  toast.style.boxShadow =
    "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)"; // Equivalent to shadow-lg
  toast.style.display = "flex"; // Equivalent to flex
  toast.style.alignItems = "center"; // Equivalent to items-center
  toast.style.gap = "0.5rem"; // Equivalent to gap-2
  toast.style.maxWidth = "20rem"; // Equivalent to max-w-sm
  toast.style.zIndex = "50"; // Equivalent to z-50
  toast.style.animation = "slide-in 0.3s ease-out"; // Equivalent to animate-slide-in
  toast.textContent = content;

  // Add CSS animation keyframes
  const style = document.createElement("style");
  style.textContent = `
    @keyframes slide-in {
      from { transform: translateX(100%); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
  `;
  document.head.appendChild(style);

  document.body.appendChild(toast);

  // Auto-remove after 3 seconds with fade-out
  setTimeout(() => {
    toast.style.transition = "opacity 0.3s ease-out";
    toast.style.opacity = "0";
    setTimeout(() => toast.remove(), 300);
  }, 3000);
};
