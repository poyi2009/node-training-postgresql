const { EntitySchema } = require('typeorm');

module.exports = new EntitySchema({
    name: 'Coach',
    tableName: 'COACH',
    columns: {
        id: {
            primary: true,
            type: 'uuid',
            generated: 'uuid'
        },
        user_id: {
            type: 'uuid',
            unique: true,
            nullable: false
        },
        experience_years: {
            type: 'integer',
            nullable: false
        },
        description: {
            type: 'text',
            nullable: false
        },
        profile_image_url: {
            type: 'varchar',
            length: 2048,
            nullable: true
        },
        created_at: {
            type: 'timestamp',
            createDate: true,
            nullable: false
        },
        updated_at: {
            type: 'timestamp',
            updateDate: true,
            nullable: false
        }
    },
    relations: {
        User: {
            target: 'User', //目標資料表
            type: 'one-to-one', //對應關係
            inverseSide: 'Coach',
            joinColumn: {
                name: 'user_id', //Coach的對應欄位
                referencedColumnName: 'id', //User的對應欄位
                foreignKeyConstraintName: 'coach_user_id_fk'
            }
        }
    }
})