#ifndef FLUID_SIM_V8_32BITS_H
#define FLUID_SIM_V8_32BITS_H

/**
 * @file v8_32bits.h
 * @brief Dispatcher for 8x32-bit vector operations (SSE/AVX/NEON).
 */

#if defined(__x86_64__) || defined(_M_X64) || defined(__i386__) || defined(_M_IX86)
    #ifdef __AVX2__
        #include "v8_32bits_avx.h"
    #elif defined(__SSE4_1__)
        #include "v8_32bits_sse.h"
    #else
        #warning "No SIMD optimization found for x86. Falling back to scalar."
    #endif
#elif defined(__arm__) || defined(__aarch64__) || defined(_M_ARM) || defined(_M_ARM64)
    #ifdef __ARM_NEON
        #include "v8_32bits_neon.h"
    #else
        #warning "No NEON optimization found for ARM. Falling back to scalar."
    #endif
#else
    #warning "Unsupported architecture for SIMD. Falling back to scalar."
#endif

namespace fluid_sim {
namespace common {

// Common generic wrappers can be added here if needed.
// These functions are expected to be implemented in the included headers 
// for specific architectures.

} // namespace common
} // namespace fluid_sim

#endif // FLUID_SIM_V8_32BITS_H
