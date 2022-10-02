﻿/* eslint-disable camelcase */
import { Color, GLSL3, Matrix3, ShaderMaterial, TangentSpaceNormalMap, Uniform, Vector2 } from "three"

// WebGL1: will render normals to RGB channel and roughness to A channel
// WebGL2: will render normals to RGB channel of "gNormal" buffer, roughness to A channel of "gNormal" buffer, depth to RGBA channel of "gDepth" buffer
// and velocity to "gVelocity" buffer

export class MRTMaterial extends ShaderMaterial {
	constructor() {
		super({
			type: "MRTMaterial",

			defines: {
				USE_UV: "",
				TEMPORAL_RESOLVE: ""
			},

			uniforms: {
				opacity: new Uniform(1),
				normalMap: new Uniform(null),
				normalScale: new Uniform(new Vector2(1, 1)),
				uvTransform: new Uniform(new Matrix3()),
				roughness: new Uniform(1),
				roughnessMap: new Uniform(null),
				map: new Uniform(null),
				color: new Uniform(new Color())
			},
			vertexShader: /* glsl */ `
                #ifdef isWebGL2
                 varying vec2 vHighPrecisionZW;
                #endif
                #define NORMAL
                #if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( TANGENTSPACE_NORMALMAP )
                    varying vec3 vViewPosition;
                #endif
                #include <common>
                #include <uv_pars_vertex>
                #include <displacementmap_pars_vertex>
                #include <normal_pars_vertex>
                #include <morphtarget_pars_vertex>
                // #include <skinning_pars_vertex>
                #include <logdepthbuf_pars_vertex>
                #include <clipping_planes_pars_vertex>
                void main() {
                    #include <uv_vertex>

                    #include <skinbase_vertex>
                    #include <beginnormal_vertex>
                    #include <skinnormal_vertex>
                    #include <defaultnormal_vertex>

                    #include <morphnormal_vertex>
                    #include <normal_vertex>
                    #include <begin_vertex>
                    #include <morphtarget_vertex>
                    // #include <skinning_vertex>
                    #include <displacementmap_vertex>
                    #include <project_vertex>
                    #include <logdepthbuf_vertex>
                    #include <clipping_planes_vertex>
                    #if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( TANGENTSPACE_NORMALMAP )
                        vViewPosition = - mvPosition.xyz;
                    #endif
                
                    #ifdef USE_UV
                        vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
                    #endif

                    #ifdef isWebGL2
                        vHighPrecisionZW = gl_Position.zw;
                    #endif 
                }
            `,

			fragmentShader: /* glsl */ `
                 #define NORMAL
                #if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( TANGENTSPACE_NORMALMAP )
                    varying vec3 vViewPosition;
                #endif
                #include <packing>
                #include <uv_pars_fragment>
                #include <normal_pars_fragment>
                #include <bumpmap_pars_fragment>
                #include <normalmap_pars_fragment>
                #include <logdepthbuf_pars_fragment>
                #include <clipping_planes_pars_fragment>
                #include <roughnessmap_pars_fragment>
                
                #ifdef isWebGL2
                layout(location = 0) out vec4 gDepth;
                layout(location = 1) out vec4 gNormal;
                layout(location = 2) out vec4 gDiffuse;

                uniform sampler2D map;
                uniform vec3 color;

                varying vec2 vHighPrecisionZW;
                #endif
                
                uniform float roughness;

                void main() {
                    #include <clipping_planes_fragment>
                    #include <logdepthbuf_fragment>
                    #include <normal_fragment_begin>
                    #include <normal_fragment_maps>

                    float roughnessFactor = roughness;
                    
                    if(roughness > 10.0e9){
                        roughnessFactor = 1.;
                    }else{
                        #ifdef USE_ROUGHNESSMAP
                            vec4 texelRoughness = texture2D( roughnessMap, vUv );
                            // reads channel G, compatible with a combined OcclusionRoughnessMetallic (RGB) texture
                            roughnessFactor *= texelRoughness.g;
                        #endif
                    }

                    vec3 normalColor = packNormalToRGB( normal );
                    #ifdef isWebGL2
                        gNormal = vec4( normalColor, roughnessFactor );

                        float fragCoordZ = 0.5 * vHighPrecisionZW[0] / vHighPrecisionZW[1] + 0.5;

                        vec4 depthColor = packDepthToRGBA( fragCoordZ );
                        gDepth = depthColor;

                        vec4 diffuseColor = vec4(color, 1.);

                        #include <map_fragment>

                        gDiffuse = diffuseColor;

                    #else
                        gl_FragColor = vec4(normalColor, roughnessFactor);
                    #endif
                }
            `,

			toneMapped: false
		})

		this.normalMapType = TangentSpaceNormalMap
		this.normalScale = new Vector2(1, 1)

		Object.defineProperty(this, "glslVersion", {
			get() {
				return "isWebGL2" in this.defines ? GLSL3 : null
			},
			set(_) {}
		})
	}
}