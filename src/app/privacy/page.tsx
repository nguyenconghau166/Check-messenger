export default function PrivacyPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold mb-6">Chinh sach quyen rieng tu</h1>
      <p className="text-sm text-gray-500 mb-8">Cap nhat lan cuoi: 31/03/2026</p>

      <div className="space-y-6 text-gray-700">
        <section>
          <h2 className="text-xl font-semibold mb-2">1. Gioi thieu</h2>
          <p>
            Ung dung Messenger Sync (&quot;chung toi&quot;) ton trong quyen rieng tu cua ban.
            Chinh sach nay mo ta cach chung toi thu thap, su dung va bao ve thong tin
            khi ban su dung dich vu cua chung toi.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">2. Thong tin chung toi thu thap</h2>
          <ul className="list-disc list-inside space-y-1">
            <li>Thong tin trang Facebook (ten trang, ID trang)</li>
            <li>Tin nhan tu cuoc hoi thoai tren Fanpage cua ban</li>
            <li>Ten va ID nguoi tham gia hoi thoai</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">3. Muc dich su dung</h2>
          <ul className="list-disc list-inside space-y-1">
            <li>Dong bo tin nhan tu Fanpage vao co so du lieu cua ban</li>
            <li>Ho tro phan tich chat luong cham soc khach hang</li>
            <li>Cai thien quy trinh cham soc khach hang</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">4. Luu tru du lieu</h2>
          <p>
            Du lieu duoc luu tru tren Supabase (nen tang co so du lieu bao mat).
            Chi ban (chu so huu ung dung) moi co quyen truy cap du lieu.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">5. Chia se du lieu</h2>
          <p>
            Chung toi KHONG chia se, ban hoac cung cap du lieu cua ban cho bat ky
            ben thu ba nao.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">6. Xoa du lieu</h2>
          <p>
            Ban co the yeu cau xoa toan bo du lieu bat ky luc nao bang cach
            lien he voi chung toi hoac tu xoa trong co so du lieu.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">7. Lien he</h2>
          <p>
            Neu ban co bat ky cau hoi nao ve chinh sach quyen rieng tu,
            vui long lien he qua email duoc dang ky tren ung dung Facebook Developer.
          </p>
        </section>
      </div>
    </div>
  );
}
