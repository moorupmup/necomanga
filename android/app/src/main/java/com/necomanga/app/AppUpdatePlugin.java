package com.necomanga.app;

import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;
import android.util.Log;
import androidx.core.content.FileProvider;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;

@CapacitorPlugin(name = "AppUpdate")
public class AppUpdatePlugin extends Plugin {
    private static final String TAG = "AppUpdate";

    @PluginMethod
    public void canRequestInstall(PluginCall call) {
        JSObject ret = new JSObject();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            ret.put("granted", getContext().getPackageManager().canRequestPackageInstalls());
        } else {
            ret.put("granted", true);
        }
        call.resolve(ret);
    }

    @PluginMethod
    public void openInstallPermissionSettings(PluginCall call) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                Intent intent = new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES);
                intent.setData(Uri.parse("package:" + getContext().getPackageName()));
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                getContext().startActivity(intent);
            }
            call.resolve();
        } catch (Exception e) {
            Log.e(TAG, "Could not open unknown app sources settings", e);
            call.reject("Could not open settings: " + e.getMessage());
        }
    }

    @PluginMethod
    public void downloadAndInstall(PluginCall call) {
        String apkUrl = call.getString("url");
        if (apkUrl == null || apkUrl.trim().isEmpty()) {
            call.reject("APK url is required");
            return;
        }

        // Run download and installation on background thread
        new Thread(() -> {
            File apkFile = null;
            try {
                URL url = new URL(apkUrl);
                HttpURLConnection conn = createConnection(url);
                conn.connect();

                // Follow redirect if GitHub releases sends 301/302
                int code = conn.getResponseCode();
                int redirects = 0;
                while ((code == HttpURLConnection.HTTP_MOVED_PERM ||
                        code == HttpURLConnection.HTTP_MOVED_TEMP ||
                        code == 307 || code == 308) && redirects < 5) {
                    String location = conn.getHeaderField("Location");
                    if (location != null && !location.isEmpty()) {
                        conn.disconnect();
                        url = new URL(location);
                        conn = createConnection(url);
                        conn.connect();
                        code = conn.getResponseCode();
                        redirects++;
                    } else {
                        break;
                    }
                }

                if (code < 200 || code >= 300) {
                    call.reject("Failed to download APK: HTTP " + code);
                    return;
                }

                long totalBytes = conn.getContentLengthLong();
                File cacheDir = getContext().getCacheDir();
                apkFile = new File(cacheDir, "necomanga_update.apk");
                if (apkFile.exists()) {
                    apkFile.delete();
                }

                InputStream in = conn.getInputStream();
                FileOutputStream out = new FileOutputStream(apkFile);
                byte[] buffer = new byte[16384];
                int bytesRead;
                long downloadedBytes = 0;
                long lastProgressEmission = 0;

                while ((bytesRead = in.read(buffer)) != -1) {
                    out.write(buffer, 0, bytesRead);
                    downloadedBytes += bytesRead;

                    long now = System.currentTimeMillis();
                    if (now - lastProgressEmission > 120) {
                        lastProgressEmission = now;
                        int percent = totalBytes > 0 ? (int) ((downloadedBytes * 100) / totalBytes) : -1;
                        JSObject progress = new JSObject();
                        progress.put("percent", percent);
                        progress.put("downloaded", downloadedBytes);
                        progress.put("total", totalBytes);
                        notifyListeners("downloadProgress", progress);
                    }
                }

                out.flush();
                out.close();
                in.close();
                conn.disconnect();

                // 100% completed
                JSObject finalProgress = new JSObject();
                finalProgress.put("percent", 100);
                finalProgress.put("downloaded", downloadedBytes);
                finalProgress.put("total", downloadedBytes);
                notifyListeners("downloadProgress", finalProgress);

                // Trigger Android Package Installer
                installApk(apkFile);

                JSObject res = new JSObject();
                res.put("success", true);
                call.resolve(res);
            } catch (Exception e) {
                Log.e(TAG, "Error downloading or installing update APK", e);
                call.reject("Download failed: " + e.getMessage(), e);
            }
        }).start();
    }

    private HttpURLConnection createConnection(URL url) throws Exception {
        HttpURLConnection conn = (HttpURLConnection) url.openConnection();
        conn.setRequestMethod("GET");
        conn.setRequestProperty("User-Agent", "Mozilla/5.0 (Linux; Android 14) NecoMangaUpdater");
        conn.setConnectTimeout(20000);
        conn.setReadTimeout(30000);
        conn.setInstanceFollowRedirects(true);
        return conn;
    }

    private void installApk(File apkFile) {
        Context context = getContext();
        Uri apkUri = FileProvider.getUriForFile(
            context,
            context.getPackageName() + ".fileprovider",
            apkFile
        );

        Intent intent = new Intent(Intent.ACTION_VIEW);
        intent.setDataAndType(apkUri, "application/vnd.android.package-archive");
        intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);

        context.startActivity(intent);
    }
}
