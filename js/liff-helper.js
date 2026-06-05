/**
 * liff-helper.js
 * LIFF初期化・LINE IDでスタッフ照合・フォールバック処理の共通モジュール
 *
 * 使い方:
 *   LiffHelper.init(liffId, gasUrl, onReady)
 *     liffId  : config.js の LIFF_ID.shift など
 *     gasUrl  : config.js の GAS_URL.shift など
 *     onReady : function(staffName, isLiff) { ... }
 *               staffName = 照合できた名前 or null
 *               isLiff    = LINE内で開いているか
 */

const LiffHelper = (function() {

  function init(liffId, gasUrl, onReady) {
    const isPlaceholder = !liffId || liffId.indexOf('【') >= 0;

    // LIFF IDが未設定の場合はブラウザモードで動作
    if (isPlaceholder) {
      console.log('[LiffHelper] LIFF ID未設定 → ブラウザモードで動作');
      onReady(null, false);
      return;
    }

    // LIFF SDK読み込み
    const script = document.createElement('script');
    script.src = 'https://static.line-scdn.net/liff/edge/2/sdk.js';
    script.onload = function() {
      liff.init({ liffId: liffId })
        .then(function() {
          if (!liff.isLoggedIn()) {
            liff.login();
            return;
          }
          liff.getProfile()
            .then(function(profile) {
              // LINE IDでスタッフ照合
              matchByLineId(profile.userId, profile.displayName, gasUrl, function(name) {
                onReady(name, true);
              });
            })
            .catch(function(err) {
              console.warn('[LiffHelper] getProfile失敗:', err);
              onReady(null, true);
            });
        })
        .catch(function(err) {
          console.warn('[LiffHelper] liff.init失敗（ブラウザモード）:', err);
          onReady(null, false);
        });
    };
    script.onerror = function() {
      console.warn('[LiffHelper] LIFF SDK読み込み失敗');
      onReady(null, false);
    };
    document.head.appendChild(script);
  }

  function matchByLineId(lineUserId, lineUserName, gasUrl, cb) {
    const cbName = 'cb_liff_' + Date.now();
    window[cbName] = function(res) {
      cleanupScript(cbName);
      if (res.success && res.data && res.data.found && res.data.enabled) {
        cb(res.data.name);
      } else if (res.success && res.data && !res.data.found) {
        // 未登録 → 新規登録リクエスト
        registerNewUser(lineUserId, lineUserName, gasUrl, cb);
      } else {
        cb(null);
      }
    };

    const qs = 'action=getStaffByLineId&lineUserId=' + encodeURIComponent(lineUserId) +
               '&callback=' + cbName;
    const s = document.createElement('script');
    s.src = gasUrl + '?' + qs;
    s.onerror = function() { cleanupScript(cbName); cb(null); };
    document.head.appendChild(s);
  }

  function registerNewUser(lineUserId, lineUserName, gasUrl, cb) {
    const form = document.createElement('form');
    addHidden(form, 'action', 'registerLineId');
    addHidden(form, 'lineUserId', lineUserId);
    addHidden(form, 'lineUserName', lineUserName);

    fetch(gasUrl, { method: 'POST', mode: 'no-cors', body: new FormData(form) })
      .then(function() {
        // 登録後も名前は未確定なのでnullを返す（管理者が後でリンク）
        cb(null);
      })
      .catch(function() { cb(null); });
  }

  function addHidden(form, name, value) {
    const input = document.createElement('input');
    input.type = 'hidden'; input.name = name; input.value = value;
    form.appendChild(input);
  }

  function cleanupScript(cbName) {
    delete window[cbName];
    document.querySelectorAll('script[src*="' + cbName + '"]').forEach(function(el) { el.remove(); });
  }

  return { init: init };
})();
