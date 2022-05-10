Page({
  data: {
    myCanvas: null,
    canvasInfo: {},
    imgUrl: '',
    activePosi: {},
    isShowConfig: false,
    activeTool: '',
    config: {
      lineWidth: 10, // 1-30
      escapeWidth: 30, // 1-100
      lineCap: 'round', // 线段两端样式 round-圆头，butt-无，square-多出一半的矩形
      lineJoin: 'round', // 线段连接处样式 round-圆滑，miter-尖角，bevel-衔接
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
    bgImgInfo: {}, // 背景图片信息
    isEscaping: false,
    activeConfig: '', // 当前正在操作的设置项
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
  // 分享朋友圈
  onShareTimeline() {
    return {};
  },
  // 转发
  onShareAppMessage() {
    return {}
  },
  // 用户触摸屏幕开始时
  touchStart(e) {
    this.setData({
      activePosi: { x: e.touches[0].x, y: e.touches[0].y }
    });
    this.data.myCtx.beginPath();
    this.data.myCtx.moveTo(e.touches[0].x, e.touches[0].y)
  },
  // 用户触摸屏幕移动时
  touchMove(e) {
    let { x, y } = e.touches[0];
    let ctx = this.data.myCtx;
    ctx.lineTo(x, y);
    ctx.stroke();
  },
  // 用户触摸屏幕结束
  touchEnd(e) {
    let { x: endX, y: endY } = e.changedTouches[0],
        { x, y} = this.data.activePosi;
    // 起始位置等于结束位置才填充一个圆
    x == endX && y === endY && this.fillActiveCircle();
  },
  // 在当前位置填充一个圆
  fillActiveCircle() {
    let { x, y } = this.data.activePosi;
    let ctx = this.data.myCtx;
    ctx.beginPath();
    ctx.arc(x, y, this.data.config.lineWidth / 2, 0, 2*Math.PI)
    ctx.fill();
  },
  // 改变设置弹窗显示与隐藏
  // 打开弹窗时，用图片代替canvas，解决canvas层级过高、弹窗不显示的问题；
  changeConfigShow() {
    this.setData({ isShowConfig: !this.data.isShowConfig, activeConfig: '' })
    if (this.data.isShowConfig) { // 打开设置弹窗
      this.canvasToImg(imgUrl => {
        this.setData({imgUrl})
      })
    }
  },
  onConfigClick(e) {
    let name = e.currentTarget.dataset.name;
    name = name === this.data.activeConfig ? '' : name;
    this.setData({activeConfig: name});
  },
  // 当画笔宽度改变时
  onBrushWidthChange(e) {
    let config = this.data.config;
    config.lineWidth = e.detail.value;
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
    // 如果没有更改
    if (config.bgColor[e.target.dataset.name] == value) return;
    // 清空背景图片
    this.setData({bgImgInfo: {}});
    config.bgColor[e.target.dataset.name] = value;
    config.bgColor.value = `rgb(${color.r}, ${color.g}, ${color.b})`;
    this.setData({ config });
    this.resetCanvas();
  },
  // 选择线段两端样式
  onLineCapClick(e) {
    let config = this.data.config;
    config.lineCap = e.currentTarget.dataset.name;
    this.setData({config});
    this.data.myCtx.lineCap = this.data.config.lineCap;
  },
  // 选择线段连接样式
  onLineJoinClick(e) {
    let config = this.data.config;
    config.lineJoin = e.currentTarget.dataset.name;
    this.setData({config});
    this.data.myCtx.lineJoin = this.data.config.lineJoin;
  },
  onChooseImage() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sizeType: ['original'],
      success: res => {
        let img = res.tempFiles[0];
        wx.getImageInfo({
          src: img.tempFilePath,
          success: info => {
            let image = this.data.myCanvas.createImage();
            image.src = img.tempFilePath;
            image.onload = (e) => {
              this.setData({
                bgImgInfo: {
                  image,
                  width: info.width,
                  height: info.height,
                }
              });
              this.resetCanvas();
            }
          }
        })
      }
    })
  },
  // 保存图片到本地
  download() {
    this.canvasToImg(url => {
      wx.saveImageToPhotosAlbum({
        filePath: url
      });
    });
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
  onEscapeClick() {
    this.changeEscapeState(true);
  },
  onBrushClick() {
    this.changeEscapeState(false);
  },
  // 切换擦除状态
  changeEscapeState(isEscaping, isReset = false) {
    if (isEscaping === this.data.isEscaping && !isReset) return;
    this.setData({isEscaping});
    let { myCtx, config } = this.data;
    if (this.data.isEscaping) {
      myCtx.strokeStyle = config.bgColor.value;
      myCtx.fillStyle = config.bgColor.value;
      myCtx.lineWidth = config.escapeWidth;
    } else {
      myCtx.strokeStyle = config.brushColor.value;
      myCtx.fillStyle = config.brushColor.value;
      myCtx.lineWidth = config.lineWidth;
    }
  },
  // 清空
  clearCanvas() {
    wx.showModal({
      title: '提示',
      content: '确定清空当前内容？',
      success: (res) => {
        if (res.confirm) {
          this.setData({bgImgInfo: {}});
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
    // 背景
    if (this.data.bgImgInfo.image) { // 有背景图片
      let img = this.data.bgImgInfo;
      myCtx.drawImage(img.image,0,0,img.width,img.height,0,0,canvasInfo.width,canvasInfo.height);
    } else { // 无背景图片，填充背景色
      myCtx.fillStyle = config.bgColor.value;
      myCtx.fillRect(0, 0, canvasInfo.width, canvasInfo.height);
    }
    // 缩放
    myCtx.scale(canvasInfo.dpr, canvasInfo.dpr);
    // 画笔宽度
    myCtx.lineWidth = config.lineWidth;
    // 画笔笔头形状
    myCtx.lineCap = config.lineCap; // round-圆头，butt-无，square-多出一半的矩形
    // 线段连接处形状
    myCtx.lineJoin = config.lineJoin; // round-圆滑，miter-尖角，bevel-衔接
    // 画笔颜色
    myCtx.strokeStyle = config.brushColor.value;
    myCtx.fillStyle = config.brushColor.value;
    this.changeEscapeState(this.data.isEscaping, true);
  },
  // 重置画笔--不会清空当前内容
  resetBrush() {
    let { config, myCtx } = this.data;
    myCtx.lineWidth = config.lineWidth;
    myCtx.fillStyle = myCtx.strokeStyle = config.brushColor.value;
    this.changeEscapeState(this.data.isEscaping, true);
  },
});
