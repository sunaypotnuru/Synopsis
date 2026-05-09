#if defined(__x86_64__) || defined(_M_X64) || defined(__i386__) || defined(_M_IX86)
#ifdef __SSE4_1__
#ifndef FLUID_SIM_V8_32BITS_SSE_H
#define FLUID_SIM_V8_32BITS_SSE_H

#include <immintrin.h>

namespace fluid_sim {
namespace common {

/**
 * @brief 8x32-bit floating point and integer vector operations using SSE.
 */

void v_load_8_32bits(const float *ptr, float *out) {
  __m128 v1 = _mm_loadu_ps(ptr);
  __m128 v2 = _mm_loadu_ps(ptr + 4);
  _mm_storeu_ps(out, v1);
  _mm_storeu_ps(out + 4, v2);
}

void v_load_8_32bits(const int *ptr, int *out) {
  __m128i v1 = _mm_loadu_si128((const __m128i *) ptr);
  __m128i v2 = _mm_loadu_si128((const __m128i *) (ptr + 4));
  _mm_storeu_si128((__m128i *) out, v1);
  _mm_storeu_si128((__m128i *) (out + 4), v2);
}

void v_store_8_32bits(float *ptr, const float *v8) {
  _mm_storeu_ps(ptr, _mm_loadu_ps(v8));
  _mm_storeu_ps(ptr + 4, _mm_loadu_ps(v8 + 4));
}

void v_store_8_32bits(int *ptr, const int *v8) {
  _mm_storeu_si128((__m128i *) ptr, _mm_loadu_si128((const __m128i *) v8));
  _mm_storeu_si128((__m128i *) (ptr + 4), _mm_loadu_si128((const __m128i *) (v8 + 4)));
}

#ifdef __AVX2__
void v_clamp_8_32bits(const int *ptr, int *out) {
  __m256i v_m0 = _mm256_loadu_si256((const __m256i*) ptr);
  __m256i v_res = _mm256_min_epi32(v_m0, _mm256_set1_epi32(255));
  v_res = _mm256_max_epi32(v_res, _mm256_setzero_si256());
  _mm256_storeu_si256((__m256i *) out, v_res);
}
#else
void v_clamp_8_32bits(const int *ptr, int *out) {
  __m128i v_m0 = _mm_loadu_si128((const __m128i*) ptr);
  __m128i v_res = _mm_min_epi32(v_m0, _mm_set1_epi32(255));
  v_res = _mm_max_epi32(v_res, _mm_setzero_si128());
  _mm_storeu_si128((__m128i *) out, v_res);

  v_m0 = _mm_loadu_si128((const __m128i*) (ptr + 4));
  v_res = _mm_min_epi32(v_m0, _mm_set1_epi32(255));
  v_res = _mm_max_epi32(v_res, _mm_setzero_si128());
  _mm_storeu_si128((__m128i *) (out + 4), v_res);
}
#endif

void v_add_8_32bits(const float *ptr1, const float *ptr2, float *out) {
  _mm_storeu_ps(out, _mm_add_ps(_mm_loadu_ps(ptr1), _mm_loadu_ps(ptr2)));
  _mm_storeu_ps(out + 4, _mm_add_ps(_mm_loadu_ps(ptr1 + 4), _mm_loadu_ps(ptr2 + 4)));
}

void v_mul_8_32bits(const float *ptr1, const float *ptr2, float *out) {
  _mm_storeu_ps(out, _mm_mul_ps(_mm_loadu_ps(ptr1), _mm_loadu_ps(ptr2)));
  _mm_storeu_ps(out + 4, _mm_mul_ps(_mm_loadu_ps(ptr1 + 4), _mm_loadu_ps(ptr2 + 4)));
}

void v_add_8_32bits(const int *ptr1, const int *ptr2, int *out) {
  _mm_storeu_si128((__m128i *) out, _mm_add_epi32(_mm_loadu_si128((const __m128i *) ptr1), _mm_loadu_si128((const __m128i *) ptr2)));
  _mm_storeu_si128((__m128i *) (out + 4), _mm_add_epi32(_mm_loadu_si128((const __m128i *) (ptr1 + 4)), _mm_loadu_si128((const __m128i *) (ptr2 + 4))));
}

void v_mul_8_32bits(const int *ptr1, const int *ptr2, int *out) {
  _mm_storeu_si128((__m128i *) out, _mm_mullo_epi32(_mm_loadu_si128((const __m128i *) ptr1), _mm_loadu_si128((const __m128i *) ptr2)));
  _mm_storeu_si128((__m128i *) (out + 4), _mm_mullo_epi32(_mm_loadu_si128((const __m128i *) (ptr1 + 4)), _mm_loadu_si128((const __m128i *) (ptr2 + 4))));
}

float v_sum_8_32bits(const float *v8) {
  __m128 v = _mm_add_ps(_mm_loadu_ps(v8), _mm_loadu_ps(v8 + 4));
  v = _mm_hadd_ps(v, v);
  v = _mm_hadd_ps(v, v);
  float res;
  _mm_store_ss(&res, v);
  return res;
}

int v_sum_8_32bits(const int *v8) {
  __m128i v = _mm_add_epi32(_mm_loadu_si128((const __m128i *) v8), _mm_loadu_si128((const __m128i *) (v8 + 4)));
  v = _mm_hadd_epi32(v, v);
  v = _mm_hadd_epi32(v, v);
  return _mm_cvtsi128_si32(v);
}

float v_dot_8_32bits(const float *ptr1, const float *ptr2) {
  __m128 v1 = _mm_mul_ps(_mm_loadu_ps(ptr1), _mm_loadu_ps(ptr2));
  __m128 v2 = _mm_mul_ps(_mm_loadu_ps(ptr1 + 4), _mm_loadu_ps(ptr2 + 4));
  __m128 v = _mm_add_ps(v1, v2);
  v = _mm_hadd_ps(v, v);
  v = _mm_hadd_ps(v, v);
  float res;
  _mm_store_ss(&res, v);
  return res;
}

int v_dot_8_32bits(const int *ptr1, const int *ptr2) {
  __m128i v1 = _mm_mullo_epi32(_mm_loadu_si128((const __m128i *) ptr1), _mm_loadu_si128((const __m128i *) ptr2));
  __m128i v2 = _mm_mullo_epi32(_mm_loadu_si128((const __m128i *) (ptr1 + 4)), _mm_loadu_si128((const __m128i *) (ptr2 + 4)));
  __m128i v = _mm_add_epi32(v1, v2);
  v = _mm_hadd_epi32(v, v);
  v = _mm_hadd_epi32(v, v);
  return _mm_cvtsi128_si32(v);
}

} // namespace common
} // namespace fluid_sim

#endif // FLUID_SIM_V8_32BITS_SSE_H
#endif // SSE
#endif // x86
