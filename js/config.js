// GASデプロイ後にURLを書き換えること
const GAS_URL = {
  shift:      'https://script.google.com/macros/s/AKfycbzcn9X9AvO5rHGeOOwnyj1Ctb_V7asir_yAXsNP5iBUw5QQESxq1BVQDLnDZBKs27vc/exec',
  wakeup:     'https://script.google.com/macros/s/AKfycbw0RTorEoVI1mwkKE2UN7Fah1lwUBS2t87jZZT-XkA3vyDchWlGMK6w3R0i6xnizdI0/exec',
  attendance: 'https://script.google.com/macros/s/AKfycbzksKAP49RjeMyXShitN1YzF_8dDLWhyJXIe2elGyjJyvjCkfWgtn6Cbms9bq88Az_Htw/exec',
  trouble:    'https://script.google.com/macros/s/AKfycbz4Aa-vI7mgMj8PEfvo6_ZqTe0BPqzK1FudrBv3RsiMtC-dIwHf2u9KShG55xs5cFT9/exec',
  admin:      'https://script.google.com/macros/s/AKfycbzYlGDctgFhG6i8x5GjJl5cV_pR7Y01g6ULDoN4AFFNtXMuP9wiQzRxuQTV2bd6zVvf/exec',
};

// スプレッドシートのURLの /d/ と /edit の間の文字列がID
const SPREADSHEET_ID = '1gm98VHnJYNo4AnbNYAi71ETMcnsmx-1hcHFJz49S0qY';

// LINE LIFF ID — LINE Developers でLIFFアプリを4つ作成後に書き換えること
// 作成方法: LINE Developers > チャネル > LIFF > 追加
// エンドポイントURL: 各ページのURL（例: https://pcube-inc.github.io/jimaku-system/shift/）
const LIFF_ID = {
  shift:      '2010288935-EetRFNLf',   // 例: 1234567890-AbCdEfGh
  wakeup:     '2010288935-bwQd9Tmq',
  attendance: '2010288935-CG4xMF6B',
  trouble:    '2010288935-b0khjSws',
};
