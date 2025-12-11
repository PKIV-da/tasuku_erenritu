 // まずは現在時刻表示を更新する関数を用意します。1秒ごとに更新します。
    const nowEl = document.getElementById('now');
    function updateNow(){
      // 現在日時を取得
      const d = new Date();
      // 画面表示用の文字列を作る
      nowEl.textContent = d.toLocaleString();
    }
    // 1秒ごとに現在時刻を更新
    setInterval(updateNow,1000);
    updateNow();

    // 3日分のタブを作る: 今日, 明日, 明後日
    const dayTabs = document.getElementById('dayTabs');
    const days = [];
    for(let i=0;i<3;i++){
      // 日付文字列（キーに使用）
      const d = new Date();
      d.setDate(d.getDate()+i);
      const key = d.toISOString().slice(0,10); // YYYY-MM-DD
      days.push(key);
    }

    // 選択中の日付キー
    let selectedDay = days[0];

    // タブを生成してDOMに追加
    days.forEach((dayKey,idx)=>{
      // ボタン要素を作る
      const btn = document.createElement('button');
      btn.className = 'tab' + (idx===0? ' active':'');
      btn.textContent = dayKey;
      // クリック時に選択を切り替える
      btn.addEventListener('click',()=>{
        // すべてのタブからactiveを外す
        document.querySelectorAll('.tab').forEach(t=>t.classList.remove('active'));
        // このボタンにactiveを付ける
        btn.classList.add('active');
        // 選択中日付を更新してリストを再描画
        selectedDay = dayKey;
        renderList();
      });
      // タブを追加
      dayTabs.appendChild(btn);
    });

    // ローカルストレージのキーのプレフィックス
    const STORAGE_PREFIX = 'simple_sched_';

    // 指定した日付のデータを取得（配列）
    function loadFor(dayKey){
      // ストレージから読み込み
      const raw = localStorage.getItem(STORAGE_PREFIX + dayKey);
      // パースして返す（無ければ空配列）
      return raw ? JSON.parse(raw) : [];
    }

    // 指定した日付のデータを保存
    function saveFor(dayKey,arr){
      // JSONにして保存
      localStorage.setItem(STORAGE_PREFIX + dayKey, JSON.stringify(arr));
    }

    // DOM要素取得
    const startInput = document.getElementById('startTime');
    const durationManual = document.getElementById('durationManual');
    const contentInput = document.getElementById('contentInput');
    const addBtn = document.getElementById('addBtn');
    const errorEl = document.getElementById('error');
    const scheduleList = document.getElementById('scheduleList');

    // 分刻みボタンにクリックイベントを付与（5,25,45）
    document.querySelectorAll('.durations .btn').forEach(b=>{
      b.addEventListener('click',()=>{
        // ボタンの data-min 属性を読み込む
        const m = parseInt(b.getAttribute('data-min'),10) || 0;
        // 手動入力欄に反映しておく
        durationManual.value = m;
      });
    });

    // 時間計算のヘルパー: HH:MM を Date オブジェクト（その日の）に変換
    function timeToDate(dayKey, hhmm){
      // 例: dayKey = '2025-11-04', hhmm = '09:30'
      const [h,m] = hhmm.split(':').map(Number);
      const d = new Date(dayKey + 'T00:00:00');
      d.setHours(h, m, 0, 0);
      return d;
    }

    // Date を HH:MM の表示文字列にする
    function dateToHHMM(d){
      const hh = String(d.getHours()).padStart(2,'0');
      const mm = String(d.getMinutes()).padStart(2,'0');
      return hh + ':' + mm;
    }

    // 追加ボタンの処理: 入力チェック → ストレージに追加 → 表示更新
    addBtn.addEventListener('click',()=>{
      // エラーメッセージをクリア
      errorEl.textContent = '';

      // 開始時間の値を取得
      const startVal = startInput.value;
      // 内容の値を取得
      const contentVal = contentInput.value.trim();
      // 分数は手動入力欄から取得
      const minutes = parseInt(durationManual.value,10);

      // 入力チェック: 開始時間が無い場合はエラー
      if(!startVal){ errorEl.textContent = '開始時間を入力してください。'; return; }
      // 入力チェック: 内容が無い場合はエラー
      if(!contentVal){ errorEl.textContent = '内容を入力してください。'; return; }
      // 入力チェック: 分数が無い or NaN の場合はエラー
      if(!minutes || isNaN(minutes) || minutes <= 0){ errorEl.textContent = '分数を1以上で入力してください（ボタンで選択可）。'; return; }

      // 開始日時（Dateオブジェクト）を作る
      const sDate = timeToDate(selectedDay, startVal);
      // 終了日時を作る（開始 + 分数）
      const eDate = new Date(sDate.getTime() + minutes * 60 * 1000);

      // 保存するオブジェクトを作る
      const item = {
        id: 'i' + Math.random().toString(36).slice(2,9), // 簡易ID
        start: sDate.toISOString(), // ISOで保存
        end: eDate.toISOString(),
        content: contentVal
      };

      // 既存配列をロード
      const arr = loadFor(selectedDay);
      // 追加してソート（開始時刻順）
      arr.push(item);
      arr.sort((a,b)=> new Date(a.start) - new Date(b.start));

      // 保存して再描画
      saveFor(selectedDay, arr);
      renderList();

      // 入力欄をクリア（内容のみ）
      contentInput.value = '';
    });

    // 指定した日付の配列を並べて表示する関数
    function renderList(){
      // まず空にする
      scheduleList.innerHTML = '';
      // 選択中の日付の配列を取得
      const arr = loadFor(selectedDay);

      // 配列が空なら案内メッセージを表示
      if(arr.length === 0){
        const el = document.createElement('div');
        el.style.padding = '12px';
        el.style.color = 'var(--muted)';
        el.textContent = '予定はまだありません。';
        scheduleList.appendChild(el);
        return;
      }

      // 今の日時を取得（比較用）
      const now = new Date();

      // 各アイテムについてDOMを作る
      arr.forEach(it =>{
        const s = new Date(it.start);
        const e = new Date(it.end);

        // アイテムのルート要素
        const itemEl = document.createElement('div');
        itemEl.className = 'item';

        // 時間と状態のメタ情報
        const meta = document.createElement('div');
        meta.className = 'meta';
        meta.innerHTML = `<div class="time">${dateToHHMM(s)} - ${dateToHHMM(e)}</div><div style="font-size:0.85rem; color:var(--muted)">${selectedDay}</div>`;

        // 内容領域
        const content = document.createElement('div');
        content.className = 'content';
        content.textContent = it.content;

        // 削除ボタン（右側）
        const del = document.createElement('button');
        del.className = 'btn outline';
        del.textContent = '削除';
        del.addEventListener('click',()=>{
          // 削除の前に確認ダイアログ
          if(!confirm('この予定を削除しますか？')) return;
          // 配列から除去して保存、再描画
          const a = loadFor(selectedDay).filter(x=>x.id !== it.id);
          saveFor(selectedDay,a);
          renderList();
        });

        // 編集ボタン（最小限の編集: 内容と時間を編集）
        const edit = document.createElement('button');
        edit.className = 'btn outline';
        edit.textContent = '編集';
        edit.addEventListener('click',()=>{
          // 編集モード: 開始時間・分・内容をフォームに読み込む
          startInput.value = dateToHHMM(s);
          const diffMin = Math.round((e - s) / 60000);
          durationManual.value = diffMin;
          contentInput.value = it.content;
          // 削除してから再追加する想定（簡易実装）
          const a = loadFor(selectedDay).filter(x=>x.id !== it.id);
          saveFor(selectedDay,a);
          renderList();
        });

        // 状態に応じてクラスを切り替える（終了時間を過ぎたら done）
        if(e.getTime() < now.getTime()){
          itemEl.classList.add('done');
        } else {
          itemEl.classList.add('pending');
        }

        // itemEl に中身を追加
        itemEl.appendChild(meta);
        itemEl.appendChild(content);
        // 右側に編集・削除ボタンをまとめた領域を追加
        const ctrlWrap = document.createElement('div');
        ctrlWrap.style.display = 'flex';
        ctrlWrap.style.gap = '8px';
        ctrlWrap.appendChild(edit);
        ctrlWrap.appendChild(del);
        itemEl.appendChild(ctrlWrap);

        // リストに追加
        scheduleList.appendChild(itemEl);
      });
    }

    // 定期的にリストを再描画して色の変化を反映（1分ごと）
    setInterval(()=>{
      renderList();
    }, 60*1000);

    // 初回表示
    renderList();

    // ページ読み込み時に startInput に現在時刻のHH:MMを入れておく
    (function setDefaultStart(){
      const d = new Date();
      // 現在時刻を5分単位に丸める
      const m = Math.ceil(d.getMinutes()/5)*5;
      d.setMinutes(m); d.setSeconds(0); d.setMilliseconds(0);
      startInput.value = dateToHHMM(d);
    })();

    // 3日分しか保存しないため、古い日付のデータが残らないように
    // 保存前にローカルストレージをクリーンアップする関数を用意
    function cleanupOld(){
      // 保持するキー一覧を作る
      const keep = new Set(days.map(d=>STORAGE_PREFIX + d));
      // すべてのlocalStorageキーをチェック
      for(let i=0;i<localStorage.length;i++){
        const k = localStorage.key(i);
        if(k && k.startsWith(STORAGE_PREFIX) && !keep.has(k)){
          // 保持対象でなければ削除
          localStorage.removeItem(k);
        }
      }
    }
    // クリーンアップを一度実行
    cleanupOld();
