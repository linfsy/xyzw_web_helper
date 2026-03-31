window.wx = {
  getSystemInfo() {}, // 用来获取机型性能
  getStorageInfo() {}, // 用来获取存储信息
  onShow(callback) {
    setTimeout(() => {
      callback({
        scene: '0',
        query: {},
        shareTicket: [],
      });
    }, 1000);
  },
  onHide(callback) {},
};

window.HSDK = {
  onLogin(data) {
     setTimeout(() => {
      data.listener({
        userSdk: {
            isNewUser: false
        }
      });
    }, 1000);
    
  },
  reportLoginState() {

  },
  onAddictionQuit(){},
  getGsSetting(){
    return {}
  }
};
window.__HORTOR_SDK__ = {
  tga: {
    track() {},
    login() {}
  }
};

window.VM2_INTERNAL_STATE_DO_NOT_USE_OR_PROGRAM_WILL_FAIL = {
  handleException: function(e) {
    return e;
  }
};

window.decimal = {
  Decimal: function(e) {
    return {
      toString: function() {
        return e.toString();
      },
      toNumber: function() {
        return Number(e);
      },
      add: function(e) {
        return new window.decimal.Decimal(Number(e) + Number(this.toString()));
      },
      sub: function(e) {
        return new window.decimal.Decimal(Number(this.toString()) - Number(e));
      },
      mul: function(e) {
        return new window.decimal.Decimal(Number(this.toString()) * Number(e));
      },
      div: function(e) {
        return new window.decimal.Decimal(Number(this.toString()) / Number(e));
      },
      equals: function(e) {
        return Number(this.toString()) === Number(e);
      },
      lt: function(e) {
        return Number(this.toString()) < Number(e);
      },
      lte: function(e) {
        return Number(this.toString()) <= Number(e);
      },
      gt: function(e) {
        return Number(this.toString()) > Number(e);
      },
      gte: function(e) {
        return Number(this.toString()) >= Number(e);
      }
    };
  }
};

// 确保全局变量o指向__HORTOR_SDK__
if (typeof o === 'undefined') {
  var o = window.__HORTOR_SDK__;
}
