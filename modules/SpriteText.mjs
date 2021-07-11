import { LinearFilter, Sprite, SpriteMaterial, Texture } from 'https://unpkg.com/three@0.130.1/build/three.module.js'

class SpriteText extends Sprite {

  constructor(text, textHeight, color) {
    super( new SpriteMaterial({ map: new Texture() }) );

    this.text = `${text}`;
    this.textHeight = textHeight;
    this.color = color;

    this.fontFace = 'Arial';
    this.fontSize = 40; // defines text resolution
    this.fontWeight = 'normal';

    this.canvas = document.createElement('canvas');
    this.texture = this.material.map;
    this.texture.minFilter = LinearFilter;

    this.update();
  }

  update() {
    const ctx = this.canvas.getContext('2d');
    const lines = this.text.split('\n');
    const font = `${this.fontWeight} ${this.fontSize}px ${this.fontFace}`;

    ctx.font = font; // measure canvas with appropriate font
    const innerWidth = Math.max(...lines.map(line => ctx.measureText(line).width));
    const innerHeight = this.fontSize * lines.length;
    this.canvas.width = innerWidth;
    this.canvas.height = innerHeight;

    ctx.font = font;
    ctx.fillStyle = this.color;
    ctx.textBaseline = 'bottom';

    lines.forEach((line, index) => {
      const lineX = (innerWidth - ctx.measureText(line).width) / 2;
      const lineY = (index + 1) * this.fontSize;
      ctx.fillText(line, lineX, lineY);
    });

    this.texture.image = this.canvas;
    this.texture.needsUpdate = true;

    const yScale = this.textHeight * lines.length;
    this.scale.set(yScale * this.canvas.width / this.canvas.height, yScale, 0);
  }
}

export { SpriteText };
