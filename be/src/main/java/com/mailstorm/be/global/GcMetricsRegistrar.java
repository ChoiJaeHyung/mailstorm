package com.mailstorm.be.global;

import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.binder.jvm.JvmGcMetrics;
import jakarta.annotation.PostConstruct;
import org.springframework.stereotype.Component;

@Component
public class GcMetricsRegistrar {

    private final MeterRegistry registry;

    public GcMetricsRegistrar(MeterRegistry registry) {
        this.registry = registry;
    }

    @PostConstruct
    public void bindGcMetrics() {
        new JvmGcMetrics().bindTo(registry);
    }
}
