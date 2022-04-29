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
      },
      bgColor: {
        r: 255,
        g: 255,
        b: 255,
        value: 'rgb(255,255,255)'
      }
    },
    oldBgColorValue: '',
    isEscaping: false
  },
  onReady() {
    wx.createSelectorQuery()
      .select('#my-canvas')
      .fields({ node: true, size: true })
      .exec((res) => {
        const myCanvas = res[0].node;
        const myCtx = myCanvas.getContext('2d');
        const dpr = wx.getSystemInfoSync().pixelRatio; // 像素比
        let canvasInfo = { // 画布信息
          dpr,
          width: res[0].width * dpr,
          height: res[0].height * dpr
        }
        this.setData({ myCanvas, myCtx, canvasInfo });
        this.resetCanvas();
      })
  },
  // 用户触摸屏幕开始时
  touchStart(e) {
    this.setData({
      activePosi: { x: e.touches[0].x, y: e.touches[0].y }
    });
    this.fillActiveCircle();
    this.data.myCtx.beginPath();
    this.data.myCtx.moveTo(e.touches[0].x, e.touches[0].y)
  },
  // 用户触摸屏幕移动时
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
  // 用户触摸屏幕结束
  touchEnd(e) {
    this.fillActiveCircle();
  },
  // 在当前位置填充一个圆
  fillActiveCircle() {
    let { x, y } = this.data.activePosi;
    let ctx = this.data.myCtx;
    ctx.beginPath();
    ctx.arc(x, y, this.data.brush.width / 2, 0, 2*Math.PI)
    ctx.fill();
  },
  animateRoutes: {
    configShow: [
      { bottom: '-60vh', ease: 'ease' },
      { bottom: '0', ease: 'ease' }
    ],
    configHide: [
      { bottom: '0', ease: 'ease-out' },
      { bottom: '-60vh', ease: 'ease-out' }
    ],
    canvasShow: [
      { top: '-100vh', opacity: 0, ease: 'ease-out' },
      { top: '0', opacity: 0, ease: 'ease-out' },
      { top: '0', opacity: 1, ease: 'ease-out' },
    ],
    canvasHide: [
      { top: '0', opacity: 1, ease: 'ease-out' },
      { top: '0', opacity: 0, ease: 'ease-out' },
      { top: '-100vh', opacity: 0, ease: 'ease-out' }
    ]
  },
  // 改变设置弹窗显示与隐藏
  // 打开弹窗时，用图片代替canvas，解决canvas层级过高、弹窗不显示的问题；
  changeConfigShow() {
    this.setData({ isShowConfig: !this.data.isShowConfig })
    if (this.data.isShowConfig) { // 打开设置弹窗
      this.setData({oldBgColorValue: this.data.brush.bgColor.value}); // 记录画板颜色值
      this.canvasToImg(imgUrl => {
        this.setData({imgUrl})
        // 抽屉显示-上升动画
        this.animate('#config-popup', this.animateRoutes.configShow, 100);
        // 让canvas不露痕迹地消失
        this.animate('#my-canvas', this.animateRoutes.canvasHide, 100);
      })
    } else { // 关闭设置弹窗
      // 更换画板颜色需要重置画布
      if (this.data.oldBgColorValue !== this.data.brush.bgColor.value) {
        this.resetCanvas();
      }
      // 抽屉隐藏-下降动画
      this.animate('#config-popup', this.animateRoutes.configHide, 100)
      // 让canvas不露痕迹地出现
      this.animate('#my-canvas', this.animateRoutes.canvasShow, 100);
    }
  },
  // 当画笔宽度改变时
  onBrushWidthChange(e) {
    let brush = this.data.brush;
    brush.width = e.detail.value;
    this.setData({ brush });
    this.resetBrush();
  },
  // 当画笔颜色拖动改变时
  onBrushColorChange(e) {
    let brush = this.data.brush,
        color = brush.color;
    brush.color[e.target.dataset.name] = e.detail.value;
    brush.color.value = `rgb(${color.r}, ${color.g}, ${color.b})`;
    this.setData({ brush });
    this.resetBrush();
  },
  // 当画笔颜色输入改变时
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
  // 当画板颜色拖动改变时
  onBgColorChange(e) {
    let brush = this.data.brush,
        color = brush.bgColor,
        value = e.detail.value;
        // 控制数值边界
    value = value < 0 ? 0 : value > 255 ? 255 : value;
    if (brush.bgColor[e.target.dataset.name] == value) return;
    // 每次打开设置弹窗，第一次修改花板颜色的时候让用户二次确认
    if (brush.bgColor.value === this.data.oldBgColorValue) {
      wx.showModal({
        title: '提示',
        content: '更改画板颜色会清空当前内容，确定继续？',
        success: (res) => {
          if (res.confirm) {
            brush.bgColor[e.target.dataset.name] = value;
            brush.bgColor.value = `rgb(${color.r}, ${color.g}, ${color.b})`;
            this.setData({ brush });
          } else if (res.cancel) {
            this.setData({ brush });
          }
        }
      })
    } else {
      brush.bgColor[e.target.dataset.name] = value;
      brush.bgColor.value = `rgb(${color.r}, ${color.g}, ${color.b})`;
      this.setData({ brush });
    }
  },
  // 保存图片到本地
  download() {
    this.canvasToImg(url => {
      wx.saveImageToPhotosAlbum({
        filePath: url
      })
    })
  },
  // 将当前画布输出为图片，callback暴露图片地址
  canvasToImg(callback) {
    wx.canvasToTempFilePath({
      canvas: this.data.myCanvas,
      fileType: 'png',
      success: function (res) {
        callback(res.tempFilePath);
      }
    })
  },
  // 擦除
  escape() {
    this.setData({isEscaping: !this.data.isEscaping});
    if (this.data.isEscaping) {
      this.data.myCtx.strokeStyle = this.data.brush.bgColor.value;
      this.data.myCtx.fillStyle = this.data.brush.bgColor.value;
    } else {
      this.data.myCtx.strokeStyle = this.data.brush.color.value;
      this.data.myCtx.fillStyle = this.data.brush.color.value;
    }
  },
  // 重置画布--会清空当前内容
  resetCanvas() {
    let {myCanvas, myCtx, brush, canvasInfo } = this.data;
    // 重置宽高
    myCanvas.width = canvasInfo.width;
    myCanvas.height = canvasInfo.height;
    // 缩放
    myCtx.scale(canvasInfo.dpr, canvasInfo.dpr);
    // 画笔宽度
    myCtx.lineWidth = brush.width;
    // 画笔颜色
    myCtx.strokeStyle = brush.color.value;
    // 先填充背景色
    myCtx.fillStyle = brush.bgColor.value;
    myCtx.fillRect(0, 0, canvasInfo.width, canvasInfo.height);
    // 再设置为画笔颜色
    myCtx.fillStyle = brush.color.value;
  },
  // 重置画笔--不会清空当前内容
  resetBrush() {
    let { brush, myCtx } = this.data;
    myCtx.lineWidth = brush.width;
    myCtx.fillStyle = myCtx.strokeStyle = brush.color.value;
  },

});
