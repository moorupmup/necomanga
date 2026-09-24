package com.necomanga.app;

import android.content.ContentResolver;
import android.content.ContentValues;
import android.content.Context;
import android.media.MediaScannerConnection;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.provider.MediaStore;
import android.util.Base64;
import android.util.Log;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;

@CapacitorPlugin(name = "MediaSave")
public class MediaSavePlugin extends Plugin {
    private static final String TAG = "MediaSave";

    @PluginMethod
    public void saveImageToGallery(PluginCall call) {
        String base64Data = call.getString("base64");
        String imageUrl = call.getString("url");
        String filename = call.getString("filename");
        String mimeType = call.getString("mimeType", "image/jpeg");
        String album = call.getString("albumName", "NecoManga");

        if (filename == null || filename.trim().isEmpty()) {
            filename = "necomanga_" + System.currentTimeMillis() + ".jpg";
        }

        if ((base64Data == null || base64Data.trim().isEmpty()) && (imageUrl == null || imageUrl.trim().isEmpty())) {
            call.reject("Either base64 or url must be provided");
            return;
        }

        final String finalFilename = filename;
        final String finalMimeType = mimeType;
        final String finalAlbum = album;

        new Thread(() -> {
            try {
                byte[] imageBytes = null;

                if (base64Data != null && !base64Data.trim().isEmpty()) {
                    String cleanBase64 = base64Data;
                    if (cleanBase64.contains(",")) {
                        cleanBase64 = cleanBase64.substring(cleanBase64.indexOf(",") + 1);
                    }
                    imageBytes = Base64.decode(cleanBase64, Base64.DEFAULT);
                } else if (imageUrl != null && !imageUrl.trim().isEmpty()) {
                    imageBytes = downloadBytes(imageUrl);
                }

                if (imageBytes == null || imageBytes.length == 0) {
                    call.reject("Failed to obtain image data");
                    return;
                }

                Context context = getContext();
                ContentResolver resolver = context.getContentResolver();
                Uri savedUri = null;

                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                    ContentValues values = new ContentValues();
                    values.put(MediaStore.Images.Media.DISPLAY_NAME, finalFilename);
                    values.put(MediaStore.Images.Media.MIME_TYPE, finalMimeType);
                    values.put(MediaStore.Images.Media.RELATIVE_PATH, Environment.DIRECTORY_PICTURES + File.separator + finalAlbum);
                    values.put(MediaStore.Images.Media.IS_PENDING, 1);

                    Uri collection = MediaStore.Images.Media.getContentUri(MediaStore.VOLUME_EXTERNAL_PRIMARY);
                    savedUri = resolver.insert(collection, values);

                    if (savedUri == null) {
                        call.reject("Failed to create MediaStore entry");
                        return;
                    }

                    try (OutputStream out = resolver.openOutputStream(savedUri)) {
                        if (out == null) {
                            call.reject("Failed to open MediaStore output stream");
                            return;
                        }
                        out.write(imageBytes);
                        out.flush();
                    }

                    values.clear();
                    values.put(MediaStore.Images.Media.IS_PENDING, 0);
                    resolver.update(savedUri, values, null, null);
                } else {
                    File picturesDir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_PICTURES);
                    File albumDir = new File(picturesDir, finalAlbum);
                    if (!albumDir.exists() && !albumDir.mkdirs()) {
                        albumDir = picturesDir;
                    }
                    File imageFile = new File(albumDir, finalFilename);
                    try (FileOutputStream fos = new FileOutputStream(imageFile)) {
                        fos.write(imageBytes);
                        fos.flush();
                    }

                    MediaScannerConnection.scanFile(
                        context,
                        new String[]{ imageFile.getAbsolutePath() },
                        new String[]{ finalMimeType },
                        null
                    );
                    savedUri = Uri.fromFile(imageFile);
                }

                Log.i(TAG, "Image successfully saved to Gallery album " + finalAlbum + ": " + finalFilename);
                JSObject ret = new JSObject();
                ret.put("success", true);
                ret.put("uri", savedUri != null ? savedUri.toString() : "");
                ret.put("album", finalAlbum);
                ret.put("filename", finalFilename);
                call.resolve(ret);

            } catch (Exception e) {
                Log.e(TAG, "Error saving image to gallery", e);
                call.reject("Error saving image to gallery: " + e.getMessage());
            }
        }).start();
    }

    private byte[] downloadBytes(String urlStr) throws Exception {
        String targetUrl = urlStr;
        if (targetUrl.contains("img.reimg.org")) {
            targetUrl = targetUrl.replace("img.reimg.org", "img-reserve.reimg2.org");
        }
        if (targetUrl.startsWith("http://")) {
            targetUrl = "https://" + targetUrl.substring(7);
        }

        HttpURLConnection conn = createConnection(targetUrl);
        conn.connect();
        int responseCode = conn.getResponseCode();

        if (responseCode >= 400 && !targetUrl.equals(urlStr)) {
            conn.disconnect();
            conn = createConnection(urlStr);
            conn.connect();
            responseCode = conn.getResponseCode();
        }

        if (responseCode == HttpURLConnection.HTTP_MOVED_PERM ||
            responseCode == HttpURLConnection.HTTP_MOVED_TEMP ||
            responseCode == 307 || responseCode == 308) {
            String location = conn.getHeaderField("Location");
            if (location != null && !location.isEmpty()) {
                conn.disconnect();
                conn = createConnection(location);
                conn.connect();
                responseCode = conn.getResponseCode();
            }
        }

        if (responseCode < 200 || responseCode >= 300) {
            conn.disconnect();
            throw new Exception("HTTP error code: " + responseCode);
        }

        try (InputStream in = conn.getInputStream();
             ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            byte[] buffer = new byte[8192];
            int bytesRead;
            while ((bytesRead = in.read(buffer)) != -1) {
                out.write(buffer, 0, bytesRead);
            }
            return out.toByteArray();
        } finally {
            conn.disconnect();
        }
    }

    private HttpURLConnection createConnection(String urlStr) throws Exception {
        URL url = new URL(urlStr);
        HttpURLConnection conn = (HttpURLConnection) url.openConnection();
        conn.setRequestMethod("GET");
        conn.setRequestProperty("Referer", "https://remanga.org/");
        conn.setRequestProperty("User-Agent", "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36");
        conn.setConnectTimeout(15000);
        conn.setReadTimeout(30000);
        conn.setInstanceFollowRedirects(true);
        return conn;
    }
}
