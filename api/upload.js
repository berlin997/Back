// /api/upload.js
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const { imageBase64, fileName, caption } = req.body;
  if (!imageBase64 || !fileName) {
    return res.status(400).json({ message: "Missing image or filename" });
  }

  const owner = "berlin997";       // ⬅️ ganti
  const repo = "Back";          // ⬅️ ganti
  const token = process.env.GITHUB_TOKEN;

  const imagePath = `images/${Date.now()}_${fileName}`;
  const galleryPath = "gallery.json";

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

    const uploaded = await uploadImage.json();
    const imageUrl = uploaded.content.html_url.replace("/blob/", "/raw/");

    // --- 2️⃣ Ambil file gallery.json yang sudah ada ---
    const getGallery = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${galleryPath}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!getGallery.ok) throw new Error("Gagal ambil gallery.json");

    const galleryData = await getGallery.json();
    const galleryJsonUrl = galleryData.download_url;
    const gallery = await fetch(galleryJsonUrl).then(r => r.json());

    // --- 3️⃣ Tambahkan item baru ke JSON ---
    gallery.unshift({
      url: imageUrl,
      caption: caption || "",
      uploaded_at: new Date().toISOString(),
    });

    // --- 4️⃣ Commit update ke gallery.json ---
    const updateGallery = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${galleryPath}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "application/vnd.github+json",
      },
      body: JSON.stringify({
        message: `Update gallery.json via upload`,
        content: Buffer.from(JSON.stringify(gallery, null, 2)).toString("base64"),
        sha: galleryData.sha,
      }),
    });

    if (!updateGallery.ok) {
      const errText = await updateGallery.text();
      throw new Error("Gagal update gallery.json: " + errText);
    }

    return res.status(200).json({ message: "Upload berhasil", imageUrl });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: err.message });
  }
}
