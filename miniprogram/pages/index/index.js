Page({
  data: {
    myCanvas: null,
    canvasInfo: {},
    imgUrl: '',
    activePosi: {},
    isShowConfig: false,
    activeTool: '',
    brush: {
      width: 3, // 画笔宽度
      color: {
        r: 0,
        g: 0,
        b: 0,
        value: 'rgb(0,0,0)'
      }
    },
  },
  onReady() {
    wx.createSelectorQuery()
      .select('#my-canvas')
      .fields({ node: true, size: true })
      .exec((res) => {
        const myCanvas = res[0].node
        const myCtx = myCanvas.getContext('2d')
        const dpr = wx.getSystemInfoSync().pixelRatio
        let canvasInfo = {
          dpr,
          width: res[0].width * dpr,
          height: res[0].height * dpr
        }
        this.setData({
          myCanvas,
          myCtx,
          canvasInfo
        });
        this.resetCanvas();
      })
  },
  resetBrush() {
    let brush = this.data.brush,
        ctx = this.data.myCtx;
    ctx.lineWidth = brush.width;
    ctx.strokeStyle = brush.color.value || '#000';
    ctx.fillStyle = brush.color.value || '#000';
  },
  touchStart(e) {
    this.setData({
      activePosi: { x: e.touches[0].x, y: e.touches[0].y }
    });
    this.fillActiveCircle();
    this.data.myCtx.beginPath();
    this.data.myCtx.moveTo(e.touches[0].x, e.touches[0].y)
  },
  touchMove(e) {
    let { x: newX, y: newY } = e.touches[0];
    let { x: oldX, y: oldY } = this.data.activePosi;
    let ctx = this.data.myCtx;
    ctx.lineTo(newX, newY)
    ctx.stroke();
    this.setData({
      activePosi: { x: newX, y: newY }
    });
  },
  touchEnd(e) {
    this.fillActiveCircle();
  },
  fillActiveCircle() {
    let { x, y } = this.data.activePosi;
    let ctx = this.data.myCtx;
    ctx.beginPath();
    ctx.arc(x, y, this.data.brush.width / 2, 0, 2*Math.PI)
    ctx.fill();
  },
  changeConfigShow() {
    this.setData({ isShowConfig: !this.data.isShowConfig });
    if (this.data.isShowConfig) {
      this.animate('#config-popup', [
        { bottom: '-40vh', ease: 'ease-out' },
        { bottom: '0', ease: 'ease-out' }
      ], 100)
      this.animate('#config-mask', [
        { opacity: 0, ease: 'ease-in' },
        { opacity: 1, ease: 'ease-in' }
      ], 100)
    } else {
      this.animate('#config-popup', [
        { bottom: '0', ease: 'ease-out' },
        { bottom: '-40vh', ease: 'ease-out' }
      ], 100)
      this.animate('#config-mask', [
        { opacity: 1, ease: 'ease-in' },
        { opacity: 0, ease: 'ease-in' }
      ], 100)
    }
  },
  onBrushWidthChange(e) {
    let brush = this.data.brush;
    brush.width = e.detail.value;
    this.setData({ brush });
    this.resetBrush();
  },
  onBrushColorChange(e) {
    let brush = this.data.brush,
        color = brush.color;
    brush.color[e.target.dataset.name] = e.detail.value;
    brush.color.value = `rgb(${color.r}, ${color.g}, ${color.b})`;
    this.setData({ brush });
    this.resetBrush();
  },
  onBrushColorInput(e) {
    let brush = this.data.brush,
        color = brush.color,
        value = e.detail.value;
    if (value < 0) value = 0;
    if (value > 255) value = 255;
    brush.color[e.target.dataset.name] = value;
    brush.color.value = `rgb(${color.r}, ${color.g}, ${color.b})`;
    this.setData({ brush });
    this.resetBrush();
  },
  download() {
    wx.canvasToTempFilePath({
      canvas: this.data.myCanvas,
      fileType: 'png',
      success: function (res) {
        console.log(res.tempFilePath)
        wx.saveImageToPhotosAlbum({
          filePath: res.tempFilePath,
          complete(e) {
            console.log(e)
          }
        })
      }
    })
  },
  resetCanvas() {
    let {myCanvas, myCtx, brush, canvasInfo } = this.data;
    myCanvas.width = canvasInfo.width
    myCanvas.height = canvasInfo.height
    myCtx.scale(canvasInfo.dpr, canvasInfo.dpr)
    myCtx.lineWidth = brush.width;
    myCtx.strokeStyle = brush.color.value;
    myCtx.fillStyle = brush.color.value;
  }

});
