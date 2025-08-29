package com.mailstorm.be.controller;

import com.mailstorm.be.service.HtmlTrackingProcessor;
import com.mailstorm.be.service.MailTrackerService;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import com.mailstorm.be.global.TrackerJwtUtil;

import java.io.IOException;
import java.net.URLDecoder;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/tracker")
@RequiredArgsConstructor
@Slf4j
public class MailTrackerController {

    private final MailTrackerService mailTrackerService;
    private final TrackerJwtUtil trackerJwtUtil;
    private final HtmlTrackingProcessor htmlTrackingProcessor;

    @GetMapping
    public List<Map<String, Object>> findDetailStats(
            @RequestParam("campaign_id") Long campaignId,
            @RequestParam(value = "type", required = false) String type) {
        return mailTrackerService.findDetailStats(campaignId, type);
    }

    @GetMapping("/open")
    public ResponseEntity<String> open(@RequestParam String token) {
        try {
            var decoded = trackerJwtUtil.verifyTrackingToken(sanitizeToken(token));
            mailTrackerService.logEvent("open", decoded.cid(), decoded.gid(), decoded.rid(), null);
            log.info("Open tracked: {}", decoded);
            return ResponseEntity.ok("OK");
        } catch (Exception e) {
            log.error("JWT 검증 에러", e);
            return ResponseEntity.badRequest().body("Invalid token");
        }
    }

    @GetMapping("/click")
    public ResponseEntity<?> click(@RequestParam String token, @RequestParam String url, HttpServletResponse res) throws IOException {
        try {
            var decoded = trackerJwtUtil.verifyTrackingToken(sanitizeToken(token));
            if (!url.matches("^https?://.*")) {
                return ResponseEntity.badRequest().body("잘못된 URL입니다.");
            }

            mailTrackerService.logEvent("click", decoded.cid(), decoded.gid(), decoded.rid(), URLDecoder.decode(url, "UTF-8"));
            res.sendRedirect(url);
            return null; // handled by redirect
        } catch (Exception e) {
            log.error("CLICK 예외", e);
            return ResponseEntity.badRequest().body("Invalid token");
        }
    }

    @GetMapping("/unsubscribe")
    public void unsubscribe(@RequestParam String token, HttpServletResponse res) throws IOException {
        try {
            var decoded = trackerJwtUtil.verifyTrackingToken(sanitizeToken(token));
            mailTrackerService.logEvent("unsubscribe", decoded.cid(), decoded.gid(), decoded.rid(), null);

            String html = unsubscribeHtml();

            res.setContentType("text/html");
            res.setCharacterEncoding("UTF-8"); // 👈 이거 추가
            res.getWriter().write(html);
        } catch (Exception e) {
            res.setStatus(400);
            res.setCharacterEncoding("UTF-8"); // 👈 이거 추가
            res.getWriter().write("Invalid token");
        }
    }

    private String sanitizeToken(String token) {
        if (token.startsWith("3D")) token = token.substring(2);
        return token.replaceAll("[\\r\\n=]", "");
    }

    private String unsubscribeHtml(){
        String html = "<!DOCTYPE html>\n" +
                "        <html lang=\"ko\">\n" +
                "        <head>\n" +
                "          <meta charset=\"UTF-8\" />\n" +
                "          <title>수신거부 완료</title>\n" +
                "          <style>\n" +
                "            body { font-family:'Pretendard','sans-serif'; background:#f9f9f9; }\n" +
                "            .wrap { max-width:430px; margin:60px auto 0; background:#fff; border-radius:14px; box-shadow:0 4px 16px #0001; padding:48px 36px 54px 36px; text-align:center;}\n" +
                "            .icon { font-size:56px; margin-bottom:18px; color:#e44;}\n" +
                "            h1 { font-size:2.2rem; margin-bottom:18px; color:#333;}\n" +
                "            p { color:#555; margin-bottom:8px;}\n" +
                "            .home-btn { margin-top:34px; display:inline-block; background:#eee; color:#333; border:none; border-radius:5px; font-size:1.1rem; padding:10px 32px; cursor:pointer; }\n" +
                "          </style>\n" +
                "        </head>\n" +
                "        <body>\n" +
                "          <div class=\"wrap\">\n" +
                "            <div class=\"icon\">\uD83D\uDCE7</div>\n" +
                "            <h2>이메일 수신거부가 완료되었습니다</h2>\n" +
                "            <p>해당 이메일로는 더 이상 광고성 메일이 발송되지 않습니다.<br/>\n" +
                "            24시간 이후부터 반영됩니다.</p>\n" +
                "            <button class=\"home-btn\" onclick=\"window.close()\">창 닫기</button>\n" +
                "          </div>\n" +
                "        </body>\n" +
                "        </html>"; // 기존 HTML 수신거부 완료 페이지 그대로 복붙
        return html;
    }
}
