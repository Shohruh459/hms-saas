export default function AdminDashboardPage({
  params,
}: {
  params: { locale: string };
}) {
  return (
    <main>
      <h1>HMS Admin — mehmon.uz/admin</h1>
      <p>Til: {params.locale}</p>
      <p>Bu yerda admin va xodimlar so&apos;rovlarni, tiketlarni va to&apos;lovlarni boshqaradi.</p>
    </main>
  );
}
