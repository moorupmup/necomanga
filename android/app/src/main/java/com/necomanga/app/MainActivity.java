package com.necomanga.app;

import android.os.Bundle;
import android.util.Log;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.BridgeWebViewClient;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.HashMap;
import java.util.Map;

public class MainActivity extends BridgeActivity {
    private static final String TAG = "NecoManga";

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(AppUpdatePlugin.class);
        registerPlugin(MediaSavePlugin.class);
        super.onCreate(savedInstanceState);

        WebView webView = bridge.getWebView();
        if (webView != null) {
            android.webkit.WebSettings settings = webView.getSettings();
            settings.setDomStorageEnabled(true);
            settings.setDatabaseEnabled(true);
            settings.setCacheMode(android.webkit.WebSettings.LOAD_DEFAULT);
        }

        bridge.setWebViewClient(new BridgeWebViewClient(bridge) {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                String rawUrl = request.getUrl().toString();
                String url = rawUrl;

                // Unwrap Capacitor HTTP interceptor proxy URL if present
                if (url.contains("/_capacitor_http_interceptor_") && request.getUrl().getQueryParameter("u") != null) {
                    url = request.getUrl().getQueryParameter("u");
                }

                // Intercept ReManga image CDN requests (manga, manhwa, manhua pages)
                if (url.contains("reimg.org") || url.contains("reimg2.org")) {
                    try {
                        String targetUrl = url.replace("img.reimg.org", "img-reserve.reimg2.org")
                                              .replace("http://", "https://");

                        HttpURLConnection conn = createConnection(targetUrl);
                        conn.connect();
                        int responseCode = conn.getResponseCode();

                        // Fallback to original url if targetUrl failed with error status
                        if (responseCode >= 400 && !targetUrl.equals(url)) {
                            conn.disconnect();
                            conn = createConnection(url);
                            conn.connect();
                            responseCode = conn.getResponseCode();
                        }

                        // Follow HTTP/HTTPS redirects if upstream sends 301/302/307/308
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

                        if (responseCode >= 200 && responseCode < 300) {
                            String mimeType = conn.getContentType();
                            if (mimeType != null && mimeType.contains(";")) {
                                mimeType = mimeType.split(";")[0].trim();
                            }
                            if (mimeType == null || mimeType.isEmpty()) {
                                mimeType = "image/webp";
                            }

                            InputStream inputStream = conn.getInputStream();
                            Map<String, String> headers = new HashMap<>();
                            headers.put("Access-Control-Allow-Origin", "*");
                            headers.put("Cache-Control", "public, max-age=2592000");

                            return new WebResourceResponse(mimeType, null, 200, "OK", headers, inputStream);
                        } else {
                            Log.w(TAG, "ReManga image request returned HTTP " + responseCode + " for: " + url);
                        }
                    } catch (Exception e) {
                        Log.e(TAG, "Error intercepting ReManga image: " + url, e);
                    }
                }

                return super.shouldInterceptRequest(view, request);
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
        });
    }
}
