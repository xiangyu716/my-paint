Page({
  data: {
    myCanvas: null,
    canvasInfo: {},
    imgUrl: '',
    activePosi: {},
    isShowConfig: false,
    activeTool: '',
    config: {
      brushWidth: 3,
      escapeWidth: 30,
      brushColor: {
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
    isEscaping: false,
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
  onShareTimeline() {
    return {};
  },
  onShareAppMessage() {
    return {}
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
    ctx.arc(x, y, this.data.config.brushWidth / 2, 0, 2*Math.PI)
    ctx.fill();
  },
  // 改变设置弹窗显示与隐藏
  // 打开弹窗时，用图片代替canvas，解决canvas层级过高、弹窗不显示的问题；
  changeConfigShow() {
    this.setData({ isShowConfig: !this.data.isShowConfig })
    if (this.data.isShowConfig) { // 打开设置弹窗
      this.setData({oldBgColorValue: this.data.config.bgColor.value}); // 记录画板颜色值
      this.canvasToImg(imgUrl => {
        this.setData({imgUrl})
      })
    } else { // 关闭设置弹窗
      // 更换画板颜色需要重置画布
      if (this.data.oldBgColorValue !== this.data.config.bgColor.value) {
        this.resetCanvas();
      }
    }
  },
  // 当画笔宽度改变时
  onBrushWidthChange(e) {
    let config = this.data.config;
    config.brushWidth = e.detail.value;
    this.setData({ config });
    this.resetBrush();
  },
  // 当画笔宽度改变时
  onEscapeWidthChange(e) {
    let config = this.data.config;
    config.escapeWidth = e.detail.value;
    this.setData({ config });
    this.resetBrush();
  },
  // 当画笔颜色拖动改变时
  onBrushColorChange(e) {
    let config = this.data.config,
        color = config.brushColor;
    config.brushColor[e.target.dataset.name] = e.detail.value;
    config.brushColor.value = `rgb(${color.r}, ${color.g}, ${color.b})`;
    this.setData({ config });
    this.resetBrush();
  },
  // 当画笔颜色输入改变时
  onBrushColorInput(e) {
    let config = this.data.config,
        color = config.brushColor,
        value = e.detail.value;
    if (value < 0) value = 0;
    if (value > 255) value = 255;
    config.brushColor[e.target.dataset.name] = value;
    config.brushColor.value = `rgb(${color.r}, ${color.g}, ${color.b})`;
    this.setData({ config });
    this.resetBrush();
  },
  // 当画板颜色拖动改变时
  onBgColorChange(e) {
    let config = this.data.config,
        color = config.bgColor,
        value = e.detail.value;
        // 控制数值边界
    value = value < 0 ? 0 : value > 255 ? 255 : value;
    if (config.bgColor[e.target.dataset.name] == value) return;
    // 每次打开设置弹窗，第一次修改花板颜色的时候让用户二次确认
    if (config.bgColor.value === this.data.oldBgColorValue) {
      wx.showModal({
        title: '提示',
        content: '更改画板颜色会清空当前内容，确定继续？',
        success: (res) => {
          if (res.confirm) {
            config.bgColor[e.target.dataset.name] = value;
            config.bgColor.value = `rgb(${color.r}, ${color.g}, ${color.b})`;
            this.setData({ config });
          } else if (res.cancel) {
            this.setData({ config });
          }
        }
      })
    } else {
      config.bgColor[e.target.dataset.name] = value;
      config.bgColor.value = `rgb(${color.r}, ${color.g}, ${color.b})`;
      this.setData({ config });
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
  escape(isReset = false) {
    // 不是重置配置，则为用户点击
    isReset !== true && this.setData({isEscaping: !this.data.isEscaping});
    if (this.data.isEscaping) {
      this.data.myCtx.strokeStyle = this.data.config.bgColor.value;
      this.data.myCtx.fillStyle = this.data.config.bgColor.value;
      this.data.myCtx.lineWidth = this.data.config.escapeWidth;
    } else {
      this.data.myCtx.strokeStyle = this.data.config.brushColor.value;
      this.data.myCtx.fillStyle = this.data.config.brushColor.value;
      this.data.myCtx.lineWidth = this.data.config.brushWidth;
    }
  },
  // 清空
  clearCanvas() {
    wx.showModal({
      title: '提示',
      content: '确定清空当前内容？',
      success: (res) => {
        if (res.confirm) {
          this.resetCanvas();
        }
      }
    })
  },
  // 重置画布--会清空当前内容
  resetCanvas() {
    let {myCanvas, myCtx, config, canvasInfo } = this.data;
    // 重置宽高
    myCanvas.width = canvasInfo.width;
    myCanvas.height = canvasInfo.height;
    // 缩放
    myCtx.scale(canvasInfo.dpr, canvasInfo.dpr);
    // 画笔宽度
    myCtx.lineWidth = config.brushWidth;
    // 画笔颜色
    myCtx.strokeStyle = config.brushColor.value;
    // 先填充背景色
    myCtx.fillStyle = config.bgColor.value;
    myCtx.fillRect(0, 0, canvasInfo.width, canvasInfo.height);
    // 再设置为画笔颜色
    myCtx.fillStyle = config.brushColor.value;
    this.escape(true);
  },
  // 重置画笔--不会清空当前内容
  resetBrush() {
    let { config, myCtx } = this.data;
    myCtx.lineWidth = config.brushWidth;
    myCtx.fillStyle = myCtx.strokeStyle = config.brushColor.value;
    this.escape(true);
  },

});
