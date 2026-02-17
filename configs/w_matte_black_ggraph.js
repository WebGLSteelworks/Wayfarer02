export const MODEL_CONFIG = {
  name: 'Matte Black CGraph',
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
		metalness: 0.2,
		opacity: 0.95,  
		
		animate: false,
		gradient: true,
		animateCamera: 'Cam_Lenses',
		  },

	logo: {
	  texture: './textures/Standard_alpha_polar.jpg',
	  emissiveIntensity: 0.6
	},

  startCamera: 'Cam_Front',
  freeCamera: 'Cam_Free'
};