export const MODEL_CONFIG = {
  name: 'Matte Black Clear',
  glb: './models/Standard_Wayfarer.glb',

    frame: {
		baseColor: [0.01, 0.01, 0.01],
		roughness: 0.55,
		metalness: 0.1
	},

	armsText: {
		overlay: './textures/Temples_wayfarer_standard_2k.png',
		color: [0.04, 0.04, 0.04]
	},

    glass: {
      color: [0.0, 0.0, 0.0],
      roughness: 0.1,
      metalness: 0.9,
      opacity: 0.15,  
	
      animate: false,
	  gradient: false,
	  animateCamera: 'Cam_Lenses'
    },

	logo: {
	  texture: './textures/Standard_alpha_clear.jpg',
	  emissiveIntensity: 2.6
	},

  startCamera: 'Cam_Front',
  freeCamera: 'Cam_Free'
};
