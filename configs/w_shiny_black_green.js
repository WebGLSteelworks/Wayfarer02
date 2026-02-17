export const MODEL_CONFIG = {
  name: 'Shiny Black Green',
  glb: './models/Standard_Wayfarer.glb',

    frame: {
		baseColor: [0.01, 0.01, 0.01],
		roughness: 0.15,
		metalness: 0.1
	},

	armsText: {
		overlay: './textures/Temples_wayfarer_standard_2k.png',
		color: [0.04, 0.04, 0.04]
	},

	glass: {
		color: [0.064, 0.068, 0.051],
		roughness: 0.03,
		metalness: 0.0,
		opacity: 0.9, 
		
		animate: false,
		animateCamera: 'Cam_Lenses'
	},

	logo: {
	  texture: './textures/Standard_alpha.jpg',
	  emissiveIntensity: 0.6
	},

	startCamera: 'Cam_Front',
	freeCamera: 'Cam_Free'
	
};
