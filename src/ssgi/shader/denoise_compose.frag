roughness *= roughness;

// view-space position of the current texel
vec3 viewPos = getViewPosition(depth);
vec3 viewDir = normalize(viewPos);

vec3 T, B;

vec3 n = viewNormal;  // view-space normal
vec3 v = viewDir;     // incoming vector

// convert view dir and view normal to world-space
vec3 V = (vec4(v, 1.) * viewMatrix).xyz;  // invert view dir
vec3 N = (vec4(n, 1.) * viewMatrix).xyz;  // invert view dir

Onb(N, T, B);

V = ToLocal(T, B, N, V);

// seems to approximate Fresnel very well
vec3 H = SampleGGXVNDF(V, roughness, roughness, 0.25, 0.25);
if (H.z < 0.0) H = -H;

vec3 l = normalize(reflect(-V, H));
l = ToWorld(T, B, N, l);

// convert reflected vector back to view-space
l = (vec4(l, 1.) * cameraMatrixWorld).xyz;
l = normalize(l);

if (dot(viewNormal, l) < 0.) l = -l;

vec3 h = normalize(v + l);  // half vector

// try to approximate the fresnel term we get when accumulating over multiple frames
float VoH = max(EPSILON, dot(v, h));
VoH = pow(VoH, 0.875);

vec4 diffuseTexel = textureLod(diffuseTexture, vUv, 0.);
vec3 diffuse = diffuseTexel.rgb;
float metalness = diffuseTexel.a;

// fresnel
vec3 f0 = mix(vec3(0.04), diffuse, metalness);
vec3 F = F_Schlick(f0, VoH);

vec3 diffuseComponent = diffuse * (1. - metalness) * (1. - F) * diffuseLightingColor;
vec3 specularComponent = specularLightingColor * F;

#if defined(DENOISE_DIFFUSE) && defined(DENOISE_SPECULAR)
// final output of the denoiser
finalOutputColor = diffuseComponent + specularComponent;
#endif

vec3 directLight = textureLod(directLightTexture, vUv, 0.).rgb;

#if defined(DENOISE_DIFFUSE) && !defined(DENOISE_SPECULAR)
finalOutputColor = diffuseComponent;
#endif

#if !defined(DENOISE_DIFFUSE) && defined(DENOISE_SPECULAR)
finalOutputColor = specularComponent;
#endif

#ifdef useDirectLight
finalOutputColor += directLight;
#endif