use std::f64::consts::PI;

use rand::Rng;
use web_sys::CanvasRenderingContext2d;

use super::sprite::{CanvasDimension, Spritable, Sprite, SpriteData};
use crate::vector::Vector;

const DIAMETER_MAX: f64 = 110.0;
const PATATOID_MINIMAL_DIAMETER_BREAKUP: f64 = 60.0;
const VERTEX_RADIUS_MIN: f64 = 0.35;
const VERTEX_RADIUS_MAX: f64 = 0.5;

pub struct Potatoid {
    sides: u8,
    pub sprite: Sprite,
    vertices: Vec<Vector>,
}

impl Spritable for Potatoid {
    fn update(&mut self) {
        self.sprite.update();
    }

    fn draw(&self, canvas: CanvasRenderingContext2d) {
        canvas.save();

        let position = self.sprite.sprite_data.position;
        let _result = canvas.translate(position.x, position.y);
        let _result = canvas.rotate(self.sprite.sprite_data.rotation);
        let vertices = &self.vertices;

        canvas.begin_path();

        canvas.move_to(vertices[0].x, vertices[0].y);

        for vertex in vertices {
            canvas.line_to(vertex.x, vertex.y);
        }

        canvas.close_path();

        canvas.stroke();

        canvas.restore();
    }

    fn collide_with(&self, sprite: Sprite) -> bool {
        self.sprite.collide_with(sprite)
    }
}

impl Potatoid {
    pub fn new(sprite_data: SpriteData, sides: u8, canvas: CanvasDimension) -> Potatoid {
        let mut potatoid = Potatoid {
            sides,
            sprite: Sprite::new(sprite_data, canvas),
            vertices: Vec::new(),
        };

        potatoid.generate_vertices();

        potatoid
    }

    fn generate_vertices(&mut self) {
        for side in 0..self.sides {
            let diameter = self.sprite.sprite_data.diameter;
            let radius = rand::thread_rng()
                .gen_range(diameter * VERTEX_RADIUS_MIN..diameter * VERTEX_RADIUS_MAX);
            let angle = 2.0 * PI / self.sides as f64 * side as f64;
            let x = radius * angle.cos();
            let y = radius * angle.sin();

            self.vertices.push(Vector::new(x, y));
        }
    }

    pub fn break_up(&self) -> Vec<Potatoid> {
        let mut new_asteroids = Vec::new();
        let diameter = self.sprite.sprite_data.diameter;

        if diameter > PATATOID_MINIMAL_DIAMETER_BREAKUP {
            let count_new_patatoids = match diameter {
                x if x > DIAMETER_MAX => 3,
                _ => 2,
            };

            for _counter in 0..count_new_patatoids {
                let mut sprite_data = self.sprite.sprite_data;

                sprite_data.diameter /= count_new_patatoids as f64 * 0.80;
                sprite_data.velocity = Vector::random_limit(1.2, 0.8);

                new_asteroids.push(Potatoid::new(sprite_data, self.sides, self.sprite.canvas));
            }
        }

        new_asteroids
    }
}
