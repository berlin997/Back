// /api/upload.js
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ message: "Method not allowed" });

  const { imageBase64, fileName, caption } = req.body;
  if (!imageBase64 || !fileName) return res.status(400).json({ message: "Missing image or filename" });

  const owner = "berlin997";
  const repo = "Back";
  const token = process.env.GITHUB_TOKEN;

  const imagePath = `images/${Date.now()}_${fileName}`;
  const htmlPath = "gallery.html";

  try {
    // --- 1️⃣ Upload gambar ke folder images/ di GitHub ---
    const uploadImage = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${imagePath}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "application/vnd.github+json",
      },
      body: JSON.stringify({
        message: `Upload ${fileName} via Vercel API`,
        content: imageBase64,
      }),
    });

    if (!uploadImage.ok) {
      const errorText = await uploadImage.text();
      throw new Error("Upload gagal: " + errorText);
    }

    const imageUrl = imagePath; // 🔥 pakai path lokal
    const cardHTML = `
      <div class="card">
        <img src="${imageUrl}" alt="foto" />
        <p>${caption || ''}</p>
      </div>
    `;

    // --- 2️⃣ Ambil file gallery.html lama ---
    const getHTML = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${htmlPath}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!getHTML.ok) throw new Error("Gagal ambil gallery.html");

    const htmlData = await getHTML.json();
    const htmlContent = Buffer.from(htmlData.content, "base64").toString("utf-8");

    // --- 3️⃣ Sisipkan card baru ke dalam div.gallery ---
    const updatedHTML = htmlContent.replace(
      /(<div class="gallery" id="gallery">)([\s\S]*?)(<\/div>)/,
      `$1$2${cardHTML}$3`
    );

    // --- 4️⃣ Commit update ke gallery.html ---
    const updateHTML = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${htmlPath}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "application/vnd.github+json",
      },
      body: JSON.stringify({
        message: `Tambah foto ke gallery.html`,
        content: Buffer.from(updatedHTML).toString("base64"),
        sha: htmlData.sha,
      }),
    });

    if (!updateHTML.ok) {
      const errText = await updateHTML.text();
      throw new Error("Gagal update gallery.html: " + errText);
    }

    return res.status(200).json({ message: "Upload berhasil", imageUrl });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: err.message });
  }
      }
