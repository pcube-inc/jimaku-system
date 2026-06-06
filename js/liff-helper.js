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

  // LIFF SDKのバージョン（公式推奨）
  const LIFF_SDK_URL = 'https://static.line-scdn.net/liff/edge/versions/2.22.3/sdk.js';

  function init(liffId, gasUrl, onReady) {
    const isPlaceholder = !liffId || liffId.indexOf('【') >= 0;

    // LIFF IDが未設定の場合はブラウザモードで動作
    if (isPlaceholder) {
      console.log('[LiffHelper] LIFF ID未設定 → ブラウザモードで動作');
      onReady(null, false);
      return;
    }

    // タイムアウト処理（10秒でフォールバック）
    let done = false;
    const timer = setTimeout(function() {
      if (!done) {
        done = true;
        console.warn('[LiffHelper] タイムアウト → ブラウザモードで動作');
        onReady(null, false);
      }
    }, 10000);

    // LIFF SDK読み込み
    const script = document.createElement('script');
    script.src = LIFF_SDK_URL;
    script.onload = function() {
      liff.init({ liffId: liffId })
        .then(function() {
          if (done) return;

          if (!liff.isInClient()) {
            // LINE外（PCブラウザなど）からアクセス
            console.log('[LiffHelper] LINE外からのアクセス → ブラウザモード');
            clearTimeout(timer); done = true;
            onReady(null, false);
            return;
          }

          if (!liff.isLoggedIn()) {
            // 未ログイン → ログインページへ
            liff.login({ redirectUri: location.href });
            return;
          }

          // プロフィール取得
          liff.getProfile()
            .then(function(profile) {
              if (done) return;
              clearTimeout(timer); done = true;
              matchByLineId(profile.userId, profile.displayName, gasUrl, function(name) {
                onReady(name, true);
              });
            })
            .catch(function(err) {
              if (done) return;
              clearTimeout(timer); done = true;
              console.warn('[LiffHelper] getProfile失敗:', err);
              onReady(null, true);
            });
        })
        .catch(function(err) {
          if (done) return;
          clearTimeout(timer); done = true;
          // エラーコード別のログ
          const code = err.code || '';
          const msg  = err.message || '';
          if (code === 'INVALID_ARGUMENT') {
            console.error('[LiffHelper] LIFF IDが無効です。LINE DevelopersのLIFF IDを確認してください。', liffId);
          } else if (code === 'UNAUTHORIZED') {
            console.error('[LiffHelper] チャネルが未公開またはテストユーザー未登録です。');
          } else {
            console.warn('[LiffHelper] liff.init失敗 ('+code+'): '+msg+' → ブラウザモードで動作');
          }
          onReady(null, false);
        });
    };
    script.onerror = function() {
      if (done) return;
      clearTimeout(timer); done = true;
      console.warn('[LiffHelper] LIFF SDK読み込み失敗 → ブラウザモードで動作');
      onReady(null, false);
    };
    document.head.appendChild(script);
  }

  // LINE IDでスタッフを照合
  function matchByLineId(lineUserId, lineUserName, gasUrl, cb) {
    const cbName = 'cb_liff_' + Date.now();

    // 照合タイムアウト（8秒）
    const timer = setTimeout(function() {
      cleanupScript(cbName);
      delete window[cbName];
      cb(null);
    }, 8000);

    window[cbName] = function(res) {
      clearTimeout(timer);
      cleanupScript(cbName);
      if (res.success && res.data && res.data.found && res.data.enabled) {
        cb(res.data.name);
      } else if (res.success && res.data && !res.data.found) {
        // 未登録 → 新規登録してnullを返す（管理者が後で名前をリンク）
        registerNewUser(lineUserId, lineUserName, gasUrl, function() {
          cb(null);
        });
      } else {
        cb(null);
      }
    };

    const qs = 'action=getStaffByLineId' +
               '&lineUserId=' + encodeURIComponent(lineUserId) +
               '&callback=' + cbName;
    const s = document.createElement('script');
    s.src = gasUrl + '?' + qs;
    s.onerror = function() {
      clearTimeout(timer);
      cleanupScript(cbName);
      cb(null);
    };
    document.head.appendChild(s);
  }

  // 未登録ユーザーをGASに登録
  function registerNewUser(lineUserId, lineUserName, gasUrl, cb) {
    const form = document.createElement('form');
    addHidden(form, 'action',       'registerLineId');
    addHidden(form, 'lineUserId',   lineUserId);
    addHidden(form, 'lineUserName', lineUserName);

    fetch(gasUrl, { method: 'POST', mode: 'no-cors', body: new FormData(form) })
      .then(function() { setTimeout(cb, 500); })
      .catch(function() { cb(); });
  }

  function addHidden(form, name, value) {
    const input = document.createElement('input');
    input.type = 'hidden'; input.name = name; input.value = value;
    form.appendChild(input);
  }

  function cleanupScript(cbName) {
    document.querySelectorAll('script[src*="' + cbName + '"]').forEach(function(el) { el.remove(); });
  }

  return { init: init };
})();
