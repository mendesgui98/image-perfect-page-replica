import {it,expect} from 'vitest';
import {openingPosition} from './work-opening';
it('posição inicial do exemplo sem reconstruir histórico',()=>{expect(openingPosition(300000,0,120000,75000,40)).toEqual({updated:300000,receivable:180000,cash:45000,progress:40});});
it('posição inicial rejeita recebido superior ao contrato',()=>{expect(()=>openingPosition(300000,0,300001,0,40)).toThrow();});
it('avanço inicial limitado a 100%',()=>{expect(()=>openingPosition(300000,0,0,0,101)).toThrow();});