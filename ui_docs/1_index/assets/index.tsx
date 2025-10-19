export default function Index() {
  return (
    <div className="min-h-screen bg-mogumogu-cream">
      <div className="max-w-[393px] mx-auto bg-mogumogu-cream">
        <header className="pt-10 pb-6 px-4">
          <div className="flex flex-col items-center">
            <img
              src="https://api.builder.io/api/v1/image/assets/TEMP/eb44c09ee8d6349b97ce397a77fd2c1ca978695e?width=314"
              alt="MoguMogu icon"
              className="w-[157px] h-[157px] rounded-full"
            />
            <h1 className="text-mogumogu-orange text-[30px] font-bold text-center mt-2 leading-tight">MoguMogu</h1>
            <p className="text-mogumogu-orange text-[15px] font-bold text-center -mt-1">モグモグ</p>
          </div>
        </header>

        <section className="px-[29px] pb-10">
          <h2 className="text-mogumogu-orange text-[30px] font-bold text-center leading-tight mb-6">
            「ここどうかな？」
            <br />
            の負担はもうない。
          </h2>

          <div className="flex justify-center mb-6">
            <img
              src="https://api.builder.io/api/v1/image/assets/TEMP/8f41da299a388dc076b2da32510f818d3937bb9b?width=458"
              alt="Food illustration"
              className="w-[229px] h-[175px]"
            />
          </div>

          <p className="text-black text-[18px] text-center leading-tight mb-8">
            「いー幹事？」は、グループでのご飯屋を見つける際のわずらわしさをシンプルに解決してくれる無料のサービスです。
          </p>

          <div className="flex justify-center">
            <button className="bg-mogumogu-orange text-white font-bold text-[18px] px-8 py-1.5 rounded-full shadow-lg hover:bg-orange-600 transition-colors">
              はじめる
            </button>
          </div>
        </section>

        <section className="px-[39px] pb-8">
          <div className="bg-mogumogu-peach rounded-[20px] p-6 mb-8">
            <p className="text-mogumogu-orange text-[15px] font-bold text-center mb-3">特徴その１</p>
            <h3 className="text-black text-[18px] font-bold text-center mb-3">1番簡単な投票方法</h3>
            <p className="text-black text-[12px] text-center leading-tight mb-6">
              スワイプによるYES/NO選択によって、簡単に
              <br />
              ご飯の行き先を決めることができます
            </p>
            <div className="relative">
              <img
                src="https://api.builder.io/api/v1/image/assets/TEMP/0def0205c5b1e6ff67afc9c66025325ebfe18a15?width=252"
                alt="App screenshot"
                className="w-[126px] h-[72px]"
              />
              <p className="text-black text-[12px] text-center mt-2 ml-32">実際の画面</p>
            </div>
          </div>

          <div className="bg-mogumogu-peach rounded-[20px] p-6">
            <p className="text-mogumogu-orange text-[15px] font-bold text-center mb-3">特徴その2</p>
            <h3 className="text-black text-[18px] font-bold text-center mb-3">会員登録不要でかんたん利用</h3>
            <p className="text-black text-[12px] text-center leading-tight mb-6">
              スワイプによるYES/NO選択によって、簡単に
              <br />
              ご飯の行き先を決めることができます
            </p>
            <div className="relative">
              <img
                src="https://api.builder.io/api/v1/image/assets/TEMP/0def0205c5b1e6ff67afc9c66025325ebfe18a15?width=252"
                alt="App screenshot"
                className="w-[126px] h-[72px]"
              />
              <p className="text-black text-[12px] text-center mt-2 ml-32">実際の画面</p>
            </div>
          </div>
        </section>

        <section className="px-4 pb-10">
          <h2 className="text-black text-[18px] font-bold text-center leading-tight mb-6">
            サークルの新歓、放課後,,,etc
            <br />
            様々なシチュエーションで活躍
          </h2>
        </section>

        <section className="px-4 pb-10">
          <h2 className="text-black text-[18px] font-bold text-center leading-tight mb-6">
            1分でわかる
            <br />
            「いー幹事？」の使い方
          </h2>

          <div className="space-y-6">
            <div className="relative">
              <h3 className="text-black text-[13px] font-bold text-center mb-4">グループを作成する</h3>
              <div className="bg-white rounded-[20px] p-6 min-h-[275px] flex items-center justify-center">
                <p className="text-black text-[18px] font-bold text-center">
                  スマホ画面
                  <br />
                  貼る
                </p>
              </div>
              <p className="text-black text-[12px] text-center mt-4 leading-tight">
                まずはグループを作成します。
                <br />
                イベントのタイトルと、探したいお店の条件を
                <br />
                入力します。
              </p>
            </div>

            <div className="relative">
              <h3 className="text-black text-[13px] font-bold text-center mb-4">2.メンバーにシェアする</h3>
              <div className="bg-white rounded-[20px] p-6 min-h-[275px] flex items-center justify-center">
                <p className="text-black text-[18px] font-bold text-center">
                  スマホ画面
                  <br />
                  貼る
                </p>
              </div>
              <p className="text-black text-[12px] text-center mt-4 leading-tight">
                URLやQRコード���用いて、グループにシェアしましょう。また、他の人を跨いでシェアすることも可能です。
              </p>
            </div>

            <div className="relative">
              <h3 className="text-black text-[13px] font-bold text-center mb-4">投票する</h3>
              <div className="bg-white rounded-[20px] p-6 min-h-[275px] flex items-center justify-center">
                <p className="text-black text-[18px] font-bold text-center">
                  スマホ画面
                  <br />
                  貼る
                </p>
              </div>
              <p className="text-black text-[12px] text-center mt-4 leading-tight">
                URL内で、投票をしましょう。
                <br />
                2択なので、ラクラク選択をしていきましょう！
              </p>
            </div>

            <div className="relative">
              <h3 className="text-black text-[13px] font-bold text-center mb-4">最終結果を確認する</h3>
              <div className="bg-white rounded-[20px] p-6 min-h-[275px] flex items-center justify-center">
                <p className="text-black text-[18px] font-bold text-center">
                  スマホ画面
                  <br />
                  貼る
                </p>
              </div>
              <p className="text-black text-[12px] text-center mt-4 leading-tight">
                1位になったご飯屋にみんなで行きましょう！
              </p>
            </div>
          </div>
        </section>

        <footer className="bg-mogumogu-footer text-white px-[35px] py-6">
          <div className="space-y-2">
            <a href="#" className="block text-[12px] leading-[30px] hover:underline">
              プライバシーポリシー
            </a>
            <a href="#" className="block text-[12px] leading-[30px] hover:underline">
              利用規約
            </a>
          </div>
          <p className="text-mogumogu-gray text-[10px] leading-[30px] mt-6">@2025 E-kanji</p>
        </footer>
      </div>
    </div>
  );
}
