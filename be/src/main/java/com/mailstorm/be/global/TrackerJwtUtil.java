package com.mailstorm.be.global;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.util.Date;

@Component
@RequiredArgsConstructor
public class TrackerJwtUtil {

    private final TrackerJwtProperties props;

    public String generateTrackingToken(Long cid, Long gid, Long rid) {
        Date now = new Date();
        Date expiry = new Date(now.getTime() + props.getJwsExpireMs());

        return Jwts.builder()
                .claim("cid", cid)
                .claim("gid", gid)
                .claim("rid", rid)
                .setIssuedAt(now)
                .setExpiration(expiry)
                .signWith(SignatureAlgorithm.HS256, props.getJwtSecret().getBytes(StandardCharsets.UTF_8))
                .compact();
    }

    public TrackingInfo verifyTrackingToken(String token) {
        Claims claims = Jwts.parser()
                .setSigningKey(props.getJwtSecret().getBytes(StandardCharsets.UTF_8))
                .parseClaimsJws(token)
                .getBody();

        return new TrackingInfo(
                ((Number) claims.get("cid")).longValue(),
                ((Number) claims.get("gid")).longValue(),
                ((Number) claims.get("rid")).longValue()
        );
    }

    public record TrackingInfo(Long cid, Long gid, Long rid) {}
}
