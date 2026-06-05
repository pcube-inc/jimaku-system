// GASデプロイ後にURLを書き換えること
const GAS_URL = {
  shift:      'https://script.google.com/macros/s/AKfycbzcn9X9AvO5rHGeOOwnyj1Ctb_V7asir_yAXsNP5iBUw5QQESxq1BVQDLnDZBKs27vc/exec',
  wakeup:     'https://script.google.com/macros/s/AKfycbwbUyXz91dfpRXOCH76xDLBNVvP72QP2lZGk__qisGPe4B1NmS6_yroEU28rRs5JXL6/exec',
  attendance: 'https://script.google.com/macros/s/AKfycbzksKAP49RjeMyXShitN1YzF_8dDLWhyJXIe2elGyjJyvjCkfWgtn6Cbms9bq88Az_Htw/exec',
  trouble:    'https://script.google.com/macros/s/AKfycbz4Aa-vI7mgMj8PEfvo6_ZqTe0BPqzK1FudrBv3RsiMtC-dIwHf2u9KShG55xs5cFT9/exec',
  admin:      'https://script.google.com/macros/s/AKfycbxr7xpK6nsMMVvPm4hss7QYG2VE3m2aWzhClJdljnp_-LE1gxwriVQwHQHVmxi7Ak4z/exec',
};
// スプレッドシートのURLの /d/ と /edit の間の文字列がID
const SPREADSHEET_ID = '1gm98VHnJYNo4AnbNYAi71ETMcnsmx-1hcHFJz49S0qY';