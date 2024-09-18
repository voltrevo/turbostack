use crate::piece::PieceType;

pub struct PieceTypeGenerator {
    pub last: u8,
}

impl PieceTypeGenerator {
    pub fn new() -> Self {
        Self { last: 0xff }
    }

    pub fn gen(&mut self, mut rand: u32) -> PieceType {
        let rand0 = rand % 0b111;
        rand >>= 3;

        if rand0 != 7 && rand0 != self.last as u32 {
            self.last = rand0 as u8;
            return PieceType::list()[rand0 as usize];
        }

        let res = rand % 7;
        self.last = res as u8;
        PieceType::list()[res as usize]
    }
}
