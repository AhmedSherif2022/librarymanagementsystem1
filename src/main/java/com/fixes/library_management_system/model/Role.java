package com.fixes.library_management_system.model;
import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fixes.library_management_system.Enums.RoleEnum;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import java.util.HashSet;
import java.util.Set;

@Entity
@Table(name = "roles")
public class Role {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;


    @NotNull(message = "Role name is mandatory")
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, unique = true, length = 30)
    private RoleEnum name;

    @ManyToMany(mappedBy = "roles")
    @JsonIgnore
    private Set<User> users = new HashSet<>();


    public Role()
    {



    }
    public Role(RoleEnum name)
    {
        this.name = name;
    }
    public Long getId()
    {
        return id;
    }
    public void setId(Long id)
    {
        this.id = id;
    }

    public RoleEnum getName()
    {
        return name;
    }
    public void setName(RoleEnum name)
    {
        this.name = name;
    }

    public Set<User> getUsers()
    {
        return users;
    }
    public void setUsers(Set<User> users)
    {
        this.users = users;
    }
}