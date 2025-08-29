package com.mailstorm.be.service;

import com.mailstorm.be.global.TrackerJwtUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.regex.Pattern;

@Component
@RequiredArgsConstructor
public class HtmlTrackingProcessor {

    private final TrackerJwtUtil jwtUtil;

    public String processHtml(String html, Long cid, Long gid, Long rid, MailerService.MailGroup footer, String receiveUrl) {
        String token = jwtUtil.generateTrackingToken(cid, gid, rid);

        // 1. 링크 클릭 추적
        Pattern linkPattern = Pattern.compile("<a\\s+[^>]*href=\"([^\"]+)\"");
        html = linkPattern.matcher(html).replaceAll(match -> {
            String originalUrl = match.group(1);
            String trackingUrl = receiveUrl + "/tracker/click?token=" + token + "&url=" + URLEncoder.encode(originalUrl, StandardCharsets.UTF_8);
            return match.group(0).replace(originalUrl, trackingUrl);
        });

        // 2-1. style 있는 img에 display:block 삽입
        Pattern imgWithStyle = Pattern.compile("<img([^>]*?)style=\"([^\"]*?)\"");
        html = imgWithStyle.matcher(html).replaceAll(match -> {
            String before = match.group(1);
            String style = match.group(2).replaceAll("display\\s*:\\s*[^;]+;?", ""); // 기존 display 제거
            return "<img" + before + "style=\"display:block;" + style + "\"";
        });

        // 2-2. style 없는 img에 display:block 추가
        Pattern imgNoStyle = Pattern.compile("<img((?!style=)[^>]*)>");
        html = imgNoStyle.matcher(html).replaceAll("<img$1 style=\"display:block;\">");

        // 3. 오픈 트래킹 이미지
        String trackingImg = "<img src=\"" + receiveUrl + "/tracker/open?token=" + token + "\" width=\"1\" height=\"1\" style=\"display:block;margin:0;padding:0;border:none;font-size:0;line-height:0;\" />";

        // 4. 푸터 HTML
        String unsubscribeUrl = receiveUrl + "/tracker/unsubscribe?token=" + token;
        String footerHtml = """
        <div style="margin-top:32px;padding:24px 0 0 0;font-size:12px;color:#888;border-top:1px solid #eee;text-align:center;">
          <strong>%s</strong><br/>
          %s<br/>%s<br/>%s<br/>
          <a href="%s" style="color:#007aff;text-decoration:underline;" target="_blank">수신거부</a>
        </div>
        """.formatted(
                footer.footerCompany(),
                footer.footerFromMail(),
                footer.footerAddress(),
                footer.footerTel(),
                unsubscribeUrl
        );

        return html.replace("</body>", trackingImg + footerHtml + "</body>");
    }
}

