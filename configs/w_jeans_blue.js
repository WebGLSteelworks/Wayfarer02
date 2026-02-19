export const MODEL_CONFIG = {
  name: 'Clear_Sapphire',
  
  glb: './models/Standard_Wayfarer.glb',

	frame: {
	  baseColor: [0.018, 0.025, 0.037],
	  roughness: 0.5,
	  metalness: 0.0,
	  trans: true,          
	  opacity: 0.9,   
	  reflectivity: 0.2 
	},

	armsText: {
		overlay: './textures/Temples_wayfarer_standard_2k.png',
		color: [0.06, 0.06, 0.07]
	},

	glass: {
		color: [0.05, 0.06, 0.08],
		roughness: 0.1,
		metalness: 0.5,
		opacity: 0.9, 
		
		animate: false,
		gradient: false,
		animateCamera: 'Cam_Lenses'
	},

	fake: {
	  texture: './textures/w_interior_fake_blur.jpg'
	},

	logo: {
	  texture: './textures/Standard_alpha_polar.jpg',
	  emissiveIntensity: 0.6
	},

	startCamera: 'Cam_Front',
	freeCamera: 'Cam_Free'
	
};
