function changeBackgroundColor() {
    const colors = ["#f0f0f0", "#FFB6C1", "#D3D3D3", "#90EE90", "#ADD8E6"];
    document.body.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
}
